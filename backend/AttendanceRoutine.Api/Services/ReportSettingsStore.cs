using System.Text.Json;
using System.Text.Json.Serialization;
using AttendanceRoutine.Api.Models;
using AttendanceRoutine.Api.Options;
using Microsoft.Extensions.Options;

namespace AttendanceRoutine.Api.Services;

public sealed class ReportSettingsStore
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly ReportOptions _defaults;
    private readonly string _contentRootPath;
    private readonly string _allowedRootPath;
    private readonly string _settingsPath;
    private readonly ILogger<ReportSettingsStore> _logger;
    private ReportRuntimeSettings? _current;

    public ReportSettingsStore(
        IOptions<ReportOptions> defaults,
        IWebHostEnvironment environment,
        ILogger<ReportSettingsStore> logger)
    {
        _defaults = defaults.Value;
        _logger = logger;
        _contentRootPath = environment.ContentRootPath;
        _allowedRootPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "..", ".."));
        _settingsPath = Path.Combine(environment.ContentRootPath, "App_Data", "report-settings.json");
    }

    public async Task<ReportRuntimeSettings> GetAsync(CancellationToken cancellationToken = default)
    {
        if (_current is not null) return _current;

        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_current is not null) return _current;
            _current = await LoadCoreAsync(cancellationToken);
            return _current;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<ReportRuntimeSettings> UpdateAsync(
        bool enabled,
        ReportJobRuntimeSettings attendance,
        ReportJobRuntimeSettings timesheet,
        CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var current = _current ?? await LoadCoreAsync(cancellationToken);
            var updated = current with
            {
                Enabled = enabled,
                Attendance = attendance with
                {
                    ExportDirectory = ValidateExportDirectory(attendance.ExportDirectory)
                },
                Timesheet = timesheet with
                {
                    ExportDirectory = ValidateExportDirectory(timesheet.ExportDirectory)
                }
            };
            await SaveCoreAsync(updated, cancellationToken);
            _current = updated;
            return updated;
        }
        finally
        {
            _gate.Release();
        }
    }

    public ReportDirectoryBrowserResponse BrowseDirectories(string? requestedPath)
    {
        var currentPath = string.IsNullOrWhiteSpace(requestedPath)
            ? _allowedRootPath
            : ValidateExportDirectory(requestedPath);
        var directories = Directory
            .EnumerateDirectories(currentPath)
            .Select(path => new ReportDirectoryItem(Path.GetFileName(path), Path.GetFullPath(path)))
            .OrderBy(item => item.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToArray();
        var parent = PathsEqual(currentPath, _allowedRootPath)
            ? null
            : Path.GetDirectoryName(currentPath);

        return new ReportDirectoryBrowserResponse(
            _allowedRootPath,
            currentPath,
            parent,
            directories);
    }

    public string ValidateExportDirectory(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException("Export directory is required.");

        var fullPath = Path.GetFullPath(
            Path.IsPathRooted(path)
                ? path
                : Path.Combine(_allowedRootPath, path));
        var relative = Path.GetRelativePath(_allowedRootPath, fullPath);
        if (relative == ".."
            || relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal)
            || Path.IsPathRooted(relative))
            throw new ArgumentException("Export directory must be inside the Report folder.");
        if (!Directory.Exists(fullPath))
            throw new DirectoryNotFoundException("The selected export directory does not exist.");
        return fullPath;
    }

    private async Task<ReportRuntimeSettings> LoadCoreAsync(CancellationToken cancellationToken)
    {
        var timeZone = DailyReportWorker.ResolveTimeZone(_defaults.TimeZoneId);
        var localToday = DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone).DateTime);
        var firstOfMonth = new DateOnly(localToday.Year, localToday.Month, 1);
        var lastOfMonth = firstOfMonth.AddMonths(1).AddDays(-1);
        var exportDirectory = Path.IsPathRooted(_defaults.ExportDirectory)
            ? Path.GetFullPath(_defaults.ExportDirectory)
            : Path.GetFullPath(Path.Combine(_contentRootPath, _defaults.ExportDirectory));
        var fallbackJob = new ReportJobRuntimeSettings(
            _defaults.RunAt,
            ReportScheduleCalculator.IsSupported(_defaults.ScheduleType)
                ? _defaults.ScheduleType
                : ReportScheduleCalculator.Daily,
            Math.Clamp(_defaults.IntervalDays, 1, 365),
            Math.Clamp(_defaults.MonthlyDay, 1, 31),
            localToday,
            firstOfMonth,
            lastOfMonth,
            exportDirectory);
        var fallback = new ReportRuntimeSettings(
            _defaults.Enabled,
            _defaults.TimeZoneId,
            _defaults.MaxExportRows,
            fallbackJob,
            fallbackJob);

        if (!File.Exists(_settingsPath)) return fallback;

        try
        {
            await using var stream = File.OpenRead(_settingsPath);
            var persisted = await JsonSerializer.DeserializeAsync<PersistedReportSettings>(
                stream,
                cancellationToken: cancellationToken);
            if (persisted is null) return fallback;

            // Migrate the original single-report format into the Attendance section.
            var legacyAttendance = persisted.Attendance ?? new PersistedReportJobSettings
            {
                RunAt = persisted.RunAt,
                ScheduleType = persisted.ScheduleType,
                IntervalDays = persisted.IntervalDays,
                MonthlyDay = persisted.MonthlyDay,
                ScheduleStartDate = persisted.ScheduleStartDate,
                ReportFromDate = persisted.ReportFromDate,
                ReportToDate = persisted.ReportToDate,
                DaysOffset = persisted.DaysOffset,
                ExportDirectory = persisted.ExportDirectory
            };
            var attendance = LoadJob(legacyAttendance, fallbackJob, localToday);
            // On first migration, Timesheet intentionally inherits Attendance values.
            var timesheet = persisted.Timesheet is null
                ? attendance
                : LoadJob(persisted.Timesheet, fallbackJob, localToday);

            return fallback with
            {
                Enabled = persisted.Enabled,
                Attendance = attendance,
                Timesheet = timesheet
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Unable to load persisted report settings; using appsettings defaults");
            return fallback;
        }
    }

    private ReportJobRuntimeSettings LoadJob(
        PersistedReportJobSettings persisted,
        ReportJobRuntimeSettings fallback,
        DateOnly localToday)
    {
        if (!TimeSpan.TryParseExact(persisted.RunAt, "hh\\:mm", null, out var runAt))
            runAt = fallback.RunAt;
        var scheduleType = ReportScheduleCalculator.IsSupported(persisted.ScheduleType ?? "")
            ? persisted.ScheduleType!
            : ReportScheduleCalculator.Daily;
        var scheduleStartDate = TryParseDate(persisted.ScheduleStartDate, out var parsedStartDate)
            ? parsedStartDate
            : localToday;
        var migratedReportDate = localToday.AddDays(persisted.DaysOffset is -1 ? -1 : 0);
        var reportFromDate = TryParseDate(persisted.ReportFromDate, out var parsedFromDate)
            ? parsedFromDate
            : migratedReportDate;
        var reportToDate = TryParseDate(persisted.ReportToDate, out var parsedToDate)
            ? parsedToDate
            : migratedReportDate;
        if (reportFromDate > reportToDate)
        {
            reportFromDate = fallback.ReportFromDate;
            reportToDate = fallback.ReportToDate;
        }

        var exportDirectory = fallback.ExportDirectory;
        if (!string.IsNullOrWhiteSpace(persisted.ExportDirectory))
        {
            try { exportDirectory = ValidateExportDirectory(persisted.ExportDirectory); }
            catch (Exception exception)
            {
                _logger.LogWarning(exception, "Persisted export directory is invalid; using the configured default");
            }
        }

        return new ReportJobRuntimeSettings(
            runAt,
            scheduleType,
            Math.Clamp(persisted.IntervalDays ?? 1, 1, 365),
            Math.Clamp(persisted.MonthlyDay ?? 25, 1, 31),
            scheduleStartDate,
            reportFromDate,
            reportToDate,
            exportDirectory);
    }

    private async Task SaveCoreAsync(
        ReportRuntimeSettings settings,
        CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(_settingsPath)!;
        Directory.CreateDirectory(directory);
        var tempPath = Path.Combine(directory, $".{Guid.NewGuid():N}.tmp");
        var persisted = new PersistedReportSettings
        {
            Enabled = settings.Enabled,
            Attendance = ToPersistedJob(settings.Attendance),
            Timesheet = ToPersistedJob(settings.Timesheet)
        };

        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(
                stream,
                persisted,
                new JsonSerializerOptions
                {
                    WriteIndented = true,
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                },
                cancellationToken);
        }
        File.Move(tempPath, _settingsPath, true);
    }

    private static PersistedReportJobSettings ToPersistedJob(ReportJobRuntimeSettings settings) =>
        new()
        {
            RunAt = settings.RunAt.ToString(@"hh\:mm"),
            ScheduleType = settings.ScheduleType,
            IntervalDays = settings.IntervalDays,
            MonthlyDay = settings.MonthlyDay,
            ScheduleStartDate = settings.ScheduleStartDate.ToString("yyyy-MM-dd"),
            ReportFromDate = settings.ReportFromDate.ToString("yyyy-MM-dd"),
            ReportToDate = settings.ReportToDate.ToString("yyyy-MM-dd"),
            ExportDirectory = settings.ExportDirectory
        };

    private sealed class PersistedReportSettings
    {
        public bool Enabled { get; set; }
        public PersistedReportJobSettings? Attendance { get; set; }
        public PersistedReportJobSettings? Timesheet { get; set; }

        // Legacy single-report fields. They are only read during migration.
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? RunAt { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ScheduleType { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? IntervalDays { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? MonthlyDay { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ScheduleStartDate { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ReportFromDate { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ReportToDate { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? DaysOffset { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ExportDirectory { get; set; }
    }

    private sealed class PersistedReportJobSettings
    {
        public string? RunAt { get; set; }
        public string? ScheduleType { get; set; }
        public int? IntervalDays { get; set; }
        public int? MonthlyDay { get; set; }
        public string? ScheduleStartDate { get; set; }
        public string? ReportFromDate { get; set; }
        public string? ReportToDate { get; set; }
        public int? DaysOffset { get; set; }
        public string? ExportDirectory { get; set; }
    }

    private static bool TryParseDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(
            value,
            "yyyy-MM-dd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out date);

    private static bool PathsEqual(string left, string right) =>
        string.Equals(
            Path.TrimEndingDirectorySeparator(Path.GetFullPath(left)),
            Path.TrimEndingDirectorySeparator(Path.GetFullPath(right)),
            OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
}
