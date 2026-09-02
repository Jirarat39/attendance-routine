namespace AttendanceRoutine.Api.Models;

public sealed class TimesheetRow
{
    public int TimesheetId { get; set; }
    public string DocumentNo { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNameEn { get; set; } = string.Empty;
    public DateTime WorkDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string ProjectCode { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public bool HasDocument { get; set; }
}

public sealed class TimesheetSummary
{
    public long Total { get; set; }
    public long Generated { get; set; }
    public long Pending { get; set; }
    public long TotalMinutes { get; set; }
}

public sealed record TimesheetSearchRequest(
    DateOnly From,
    DateOnly To,
    string? Query,
    string Status,
    int Page,
    int PageSize);

public sealed record PagedTimesheetResponse(
    IReadOnlyList<TimesheetRow> Items,
    TimesheetSummary Summary,
    int Page,
    int PageSize,
    long TotalPages);
