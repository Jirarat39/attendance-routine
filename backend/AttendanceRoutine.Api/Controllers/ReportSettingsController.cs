using System.Globalization;
using AttendanceRoutine.Api.Models;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AttendanceRoutine.Api.Controllers;

[ApiController]
[Route("api/report-settings")]
public sealed class ReportSettingsController(ReportSettingsStore settingsStore) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ReportSettingsResponse>> Get(CancellationToken cancellationToken)
    {
        var settings = await settingsStore.GetAsync(cancellationToken);
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<ActionResult<ReportSettingsResponse>> Update(
        UpdateReportSettingsRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryBuildJob(request.Attendance, "Attendance", out var attendance, out var attendanceError))
            return BadRequest(new { message = attendanceError });
        if (!TryBuildJob(request.Timesheet, "Timesheet", out var timesheet, out var timesheetError))
            return BadRequest(new { message = timesheetError });

        try
        {
            var settings = await settingsStore.UpdateAsync(
                request.Enabled,
                attendance!,
                timesheet!,
                cancellationToken);
            return Ok(ToResponse(settings));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (DirectoryNotFoundException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("directories")]
    public ActionResult<ReportDirectoryBrowserResponse> BrowseDirectories([FromQuery] string? path)
    {
        try
        {
            return Ok(settingsStore.BrowseDirectories(path));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (DirectoryNotFoundException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, new { message = "The selected folder cannot be accessed." });
        }
    }

    private static ReportSettingsResponse ToResponse(ReportRuntimeSettings settings)
    {
        return new ReportSettingsResponse(
            settings.Enabled,
            settings.TimeZoneId,
            ToJobResponse(settings.Attendance, settings),
            ToJobResponse(settings.Timesheet, settings));
    }

    private static ReportJobSettingsResponse ToJobResponse(
        ReportJobRuntimeSettings job,
        ReportRuntimeSettings settings) =>
        new(
            job.RunAt.ToString(@"hh\:mm"),
            job.ScheduleType,
            job.IntervalDays,
            job.MonthlyDay,
            job.ScheduleStartDate.ToString("yyyy-MM-dd"),
            job.ReportFromDate.ToString("yyyy-MM-dd"),
            job.ReportToDate.ToString("yyyy-MM-dd"),
            job.ExportDirectory,
            ReportScheduleCalculator.GetNextRunAt(
                job,
                settings.Enabled,
                settings.TimeZoneId,
                DateTimeOffset.UtcNow));

    private static bool TryBuildJob(
        UpdateReportJobSettingsRequest? request,
        string name,
        out ReportJobRuntimeSettings? job,
        out string error)
    {
        job = null;
        error = "";
        if (request is null)
        {
            error = $"{name} settings are required.";
            return false;
        }
        if (!TimeSpan.TryParseExact(
                request.RunAt,
                "hh\\:mm",
                CultureInfo.InvariantCulture,
                out var runAt)
            || runAt < TimeSpan.Zero
            || runAt >= TimeSpan.FromDays(1))
        {
            error = $"{name} RunAt must use HH:mm format.";
            return false;
        }

        var scheduleType = request.ScheduleType?.Trim().ToLowerInvariant() ?? "";
        if (!ReportScheduleCalculator.IsSupported(scheduleType))
        {
            error = $"{name} ScheduleType must be daily, interval, or monthly.";
            return false;
        }
        if (request.IntervalDays is < 1 or > 365)
        {
            error = $"{name} IntervalDays must be between 1 and 365.";
            return false;
        }
        if (request.MonthlyDay is < 1 or > 31)
        {
            error = $"{name} MonthlyDay must be between 1 and 31.";
            return false;
        }
        if (!TryParseDate(request.ScheduleStartDate, out var scheduleStartDate))
        {
            error = $"{name} ScheduleStartDate must use yyyy-MM-dd format.";
            return false;
        }
        if (!TryParseDate(request.ReportFromDate, out var reportFromDate))
        {
            error = $"{name} ReportFromDate must use yyyy-MM-dd format.";
            return false;
        }
        if (!TryParseDate(request.ReportToDate, out var reportToDate))
        {
            error = $"{name} ReportToDate must use yyyy-MM-dd format.";
            return false;
        }
        if (reportFromDate > reportToDate)
        {
            error = $"{name}: The \"From Date\" cannot be later than the \"To Date\".";
            return false;
        }

        job = new ReportJobRuntimeSettings(
            runAt,
            scheduleType,
            request.IntervalDays,
            request.MonthlyDay,
            scheduleStartDate,
            reportFromDate,
            reportToDate,
            request.ExportDirectory);
        return true;
    }

    private static bool TryParseDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(
            value,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
}
