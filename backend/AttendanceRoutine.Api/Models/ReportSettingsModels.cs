namespace AttendanceRoutine.Api.Models;

public sealed record ReportJobRuntimeSettings(
    TimeSpan RunAt,
    string ScheduleType,
    int IntervalDays,
    int MonthlyDay,
    DateOnly ScheduleStartDate,
    DateOnly ReportFromDate,
    DateOnly ReportToDate,
    string ExportDirectory);

public sealed record ReportRuntimeSettings(
    bool Enabled,
    string TimeZoneId,
    int MaxExportRows,
    ReportJobRuntimeSettings Attendance,
    ReportJobRuntimeSettings Timesheet);

public sealed record UpdateReportJobSettingsRequest(
    string RunAt,
    string ScheduleType,
    int IntervalDays,
    int MonthlyDay,
    string ScheduleStartDate,
    string ReportFromDate,
    string ReportToDate,
    string ExportDirectory);

public sealed record UpdateReportSettingsRequest(
    bool Enabled,
    UpdateReportJobSettingsRequest Attendance,
    UpdateReportJobSettingsRequest Timesheet);

public sealed record ReportJobSettingsResponse(
    string RunAt,
    string ScheduleType,
    int IntervalDays,
    int MonthlyDay,
    string ScheduleStartDate,
    string ReportFromDate,
    string ReportToDate,
    string ExportDirectory,
    DateTimeOffset? NextRunAt);

public sealed record ReportSettingsResponse(
    bool Enabled,
    string TimeZoneId,
    ReportJobSettingsResponse Attendance,
    ReportJobSettingsResponse Timesheet);

public sealed record ReportDirectoryItem(
    string Name,
    string Path);

public sealed record ReportDirectoryBrowserResponse(
    string RootPath,
    string CurrentPath,
    string? ParentPath,
    IReadOnlyList<ReportDirectoryItem> Directories);
