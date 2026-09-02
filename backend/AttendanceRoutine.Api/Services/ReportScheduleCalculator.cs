using AttendanceRoutine.Api.Models;

namespace AttendanceRoutine.Api.Services;

public static class ReportScheduleCalculator
{
    public const string Daily = "daily";
    public const string Interval = "interval";
    public const string Monthly = "monthly";

    public static bool IsSupported(string scheduleType) =>
        scheduleType is Daily or Interval or Monthly;

    public static bool IsRunDate(ReportJobRuntimeSettings settings, DateOnly date)
    {
        return settings.ScheduleType switch
        {
            Daily => true,
            Interval => date >= settings.ScheduleStartDate
                        && (date.DayNumber - settings.ScheduleStartDate.DayNumber)
                        % settings.IntervalDays == 0,
            Monthly => date.Day == Math.Min(
                settings.MonthlyDay,
                DateTime.DaysInMonth(date.Year, date.Month)),
            _ => false
        };
    }

    public static DateTimeOffset? GetNextRunAt(
        ReportJobRuntimeSettings settings,
        bool enabled,
        string timeZoneId,
        DateTimeOffset utcNow)
    {
        if (!enabled) return null;

        var timeZone = DailyReportWorker.ResolveTimeZone(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTime(utcNow, timeZone);
        var today = DateOnly.FromDateTime(localNow.DateTime);
        var nextDate = settings.ScheduleType switch
        {
            Interval => GetNextIntervalDate(settings, today, localNow.TimeOfDay),
            Monthly => GetNextMonthlyDate(settings, today, localNow.TimeOfDay),
            _ => localNow.TimeOfDay < settings.RunAt ? today : today.AddDays(1)
        };
        var localDateTime = nextDate.ToDateTime(TimeOnly.FromTimeSpan(settings.RunAt));
        var utc = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified),
            timeZone);
        return new DateTimeOffset(utc, TimeSpan.Zero);
    }

    private static DateOnly GetNextIntervalDate(
        ReportJobRuntimeSettings settings,
        DateOnly today,
        TimeSpan currentTime)
    {
        if (today < settings.ScheduleStartDate) return settings.ScheduleStartDate;

        var daysSinceStart = today.DayNumber - settings.ScheduleStartDate.DayNumber;
        var remainder = daysSinceStart % settings.IntervalDays;
        if (remainder == 0 && currentTime < settings.RunAt) return today;

        var daysUntilNext = remainder == 0
            ? settings.IntervalDays
            : settings.IntervalDays - remainder;
        return today.AddDays(daysUntilNext);
    }

    private static DateOnly GetNextMonthlyDate(
        ReportJobRuntimeSettings settings,
        DateOnly today,
        TimeSpan currentTime)
    {
        var thisMonth = GetMonthlyDate(today.Year, today.Month, settings.MonthlyDay);
        if (thisMonth > today || (thisMonth == today && currentTime < settings.RunAt))
            return thisMonth;

        var nextMonth = today.AddMonths(1);
        return GetMonthlyDate(nextMonth.Year, nextMonth.Month, settings.MonthlyDay);
    }

    private static DateOnly GetMonthlyDate(int year, int month, int requestedDay) =>
        new(year, month, Math.Min(requestedDay, DateTime.DaysInMonth(year, month)));
}
