namespace AttendanceRoutine.Api.Options;

public sealed class ReportOptions
{
    public const string SectionName = "Reports";

    public bool Enabled { get; set; } = true;
    public TimeSpan RunAt { get; set; } = new(9, 0, 0);
    public string TimeZoneId { get; set; } = "Asia/Bangkok";
    public string ScheduleType { get; set; } = "daily";
    public int IntervalDays { get; set; } = 1;
    public int MonthlyDay { get; set; } = 25;
    public string ExportDirectory { get; set; } = "Exports";
    public int MaxExportRows { get; set; } = 100_000;
}
