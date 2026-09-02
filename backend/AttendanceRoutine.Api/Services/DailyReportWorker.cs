using AttendanceRoutine.Api.Models;

namespace AttendanceRoutine.Api.Services;

public sealed class DailyReportWorker(
    IServiceScopeFactory scopeFactory,
    ReportSettingsStore settingsStore,
    ILogger<DailyReportWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        string? lastSuccessfulAttendanceRunKey = null;
        string? lastSuccessfulTimesheetRunKey = null;
        while (!stoppingToken.IsCancellationRequested)
        {
            var settings = await settingsStore.GetAsync(stoppingToken);
            var timeZone = ResolveTimeZone(settings.TimeZoneId);
            var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);
            var runDate = DateOnly.FromDateTime(localNow.DateTime);
            var attendanceRunKey = GetRunKey(settings.Attendance, runDate);
            var timesheetRunKey = GetRunKey(settings.Timesheet, runDate);

            if (settings.Enabled
                && ReportScheduleCalculator.IsRunDate(settings.Attendance, runDate)
                && localNow.TimeOfDay >= settings.Attendance.RunAt
                && lastSuccessfulAttendanceRunKey != attendanceRunKey)
            {
                try
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    var reportService = scope.ServiceProvider.GetRequiredService<ExcelReportService>();
                    var path = await reportService.SaveRangeAsync(
                        settings.Attendance.ReportFromDate,
                        settings.Attendance.ReportToDate,
                        stoppingToken);
                    lastSuccessfulAttendanceRunKey = attendanceRunKey;
                    logger.LogInformation("Scheduled Attendance Excel report created: {Path}", path);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    logger.LogError(exception, "Scheduled Attendance Excel report failed");
                }
            }

            if (settings.Enabled
                && ReportScheduleCalculator.IsRunDate(settings.Timesheet, runDate)
                && localNow.TimeOfDay >= settings.Timesheet.RunAt
                && lastSuccessfulTimesheetRunKey != timesheetRunKey)
            {
                try
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    var reportService = scope.ServiceProvider.GetRequiredService<TimesheetExcelService>();
                    var path = await reportService.SaveRangeAsync(
                        settings.Timesheet.ReportFromDate,
                        settings.Timesheet.ReportToDate,
                        stoppingToken);
                    lastSuccessfulTimesheetRunKey = timesheetRunKey;
                    logger.LogInformation("Scheduled Timesheet Excel report created: {Path}", path);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    logger.LogError(exception, "Scheduled Timesheet Excel report failed");
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private static string GetRunKey(
        ReportJobRuntimeSettings settings,
        DateOnly runDate) =>
        string.Join(
            '|',
            runDate.ToString("yyyy-MM-dd"),
            settings.RunAt.ToString(@"hh\:mm"),
            settings.ScheduleType,
            settings.IntervalDays,
            settings.MonthlyDay,
            settings.ScheduleStartDate.ToString("yyyy-MM-dd"),
            settings.ReportFromDate.ToString("yyyy-MM-dd"),
            settings.ReportToDate.ToString("yyyy-MM-dd"),
            Path.GetFullPath(settings.ExportDirectory));

    public static TimeZoneInfo ResolveTimeZone(string configured)
    {
        foreach (var id in new[] { configured, "Asia/Bangkok", "SE Asia Standard Time" }.Distinct())
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc;
    }
}
