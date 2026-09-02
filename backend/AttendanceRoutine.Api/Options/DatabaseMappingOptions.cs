namespace AttendanceRoutine.Api.Options;

public sealed class DatabaseMappingOptions
{
    public const string SectionName = "DatabaseMapping";

    public string AttendanceTable { get; set; } = "dbo.Attendances";
    public string EmployeeTable { get; set; } = "dbo.Employees";
    public string AttendanceIdColumn { get; set; } = string.Empty;
    public string AttendanceEmployeeKeyColumn { get; set; } = string.Empty;
    public string CheckInColumn { get; set; } = string.Empty;
    public string CheckOutColumn { get; set; } = string.Empty;
    public string EmployeeKeyColumn { get; set; } = string.Empty;
    public string EmployeeCodeColumn { get; set; } = string.Empty;
    public string EmployeeNameColumn { get; set; } = string.Empty;
    public string DepartmentColumn { get; set; } = string.Empty;
}

