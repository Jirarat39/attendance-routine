namespace AttendanceRoutine.Api.Models;

public sealed class AttendanceRow
{
    public string AttendanceId { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNameEn { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string DepartmentEn { get; set; } = string.Empty;
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
}

public sealed class AttendanceSummary
{
    public long Total { get; set; }
    public long Completed { get; set; }
    public long MissingCheckOut { get; set; }
}

public sealed record AttendanceSearchRequest(
    DateOnly From,
    DateOnly To,
    string? Query,
    string Status,
    int Page,
    int PageSize);

public sealed record PagedAttendanceResponse(
    IReadOnlyList<AttendanceRow> Items,
    AttendanceSummary Summary,
    int Page,
    int PageSize,
    long TotalPages);

public sealed record ResolvedDatabaseSchema(
    string AttendanceTable,
    string EmployeeTable,
    string AttendanceIdColumn,
    string AttendanceEmployeeKeyColumn,
    string CheckInColumn,
    string? CheckOutColumn,
    string EmployeeKeyColumn,
    string EmployeeCodeColumn,
    string? EmployeeNameColumn,
    string? EmployeeFirstNameEnColumn,
    string? EmployeeLastNameEnColumn,
    string? DepartmentColumn);
