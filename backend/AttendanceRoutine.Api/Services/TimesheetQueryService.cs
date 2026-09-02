using AttendanceRoutine.Api.Data;
using AttendanceRoutine.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AttendanceRoutine.Api.Services;

public sealed class TimesheetQueryService(AttendanceDbContext db)
{
    public async Task<PagedTimesheetResponse> SearchAsync(
        TimesheetSearchRequest request,
        CancellationToken cancellationToken)
    {
        ValidateRange(request.From, request.To);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 10, 200);
        var (whereSql, parameters) = BuildWhere(
            request.From,
            request.To,
            request.Query,
            request.Status);

        var summarySql = $"""
            SELECT
                COUNT_BIG(1) AS [Total],
                COALESCE(SUM(CASE WHEN {HasDocumentSql} = 1 THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END), 0) AS [Generated],
                COALESCE(SUM(CASE WHEN {HasDocumentSql} = 0 THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END), 0) AS [Pending],
                COALESCE(SUM(CAST({DurationMinutesSql} AS bigint)), 0) AS [TotalMinutes]
            {FromSql}
            {whereSql}
            """;
        var summary = (await db.Database
                .SqlQueryRaw<TimesheetSummary>(summarySql, parameters)
                .ToListAsync(cancellationToken))
            .Single();

        var dataSql = $"""
            {SelectSql}
            {FromSql}
            {whereSql}
            ORDER BY ts.[WorkDate] DESC, ts.[StartTime] DESC, ts.[Id] DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;
        var dataParameters = parameters
            .Concat([
                new SqlParameter("@offset", (page - 1) * pageSize),
                new SqlParameter("@pageSize", pageSize)
            ])
            .Cast<object>()
            .ToArray();
        var items = await db.Database
            .SqlQueryRaw<TimesheetRow>(dataSql, dataParameters)
            .ToListAsync(cancellationToken);

        var totalPages = summary.Total == 0
            ? 0
            : (long)Math.Ceiling(summary.Total / (double)pageSize);
        return new PagedTimesheetResponse(items, summary, page, pageSize, totalPages);
    }

    public async Task<IReadOnlyList<TimesheetRow>> GetForExportAsync(
        DateOnly from,
        DateOnly to,
        string? query,
        string status,
        int maxRows,
        CancellationToken cancellationToken)
    {
        ValidateRange(from, to);
        var (whereSql, parameters) = BuildWhere(from, to, query, status);
        var sql = $"""
            {SelectSql}
            {FromSql}
            {whereSql}
            ORDER BY ts.[WorkDate], ts.[StartTime], ts.[Id]
            OFFSET 0 ROWS FETCH NEXT @maxRows ROWS ONLY
            """;
        var allParameters = parameters
            .Append(new SqlParameter("@maxRows", Math.Clamp(maxRows, 1, 500_000)))
            .Cast<object>()
            .ToArray();
        return await db.Database
            .SqlQueryRaw<TimesheetRow>(sql, allParameters)
            .ToListAsync(cancellationToken);
    }

    private static (string WhereSql, object[] Parameters) BuildWhere(
        DateOnly from,
        DateOnly to,
        string? query,
        string status)
    {
        var clauses = new List<string>
        {
            "ts.[WorkDate] >= @from",
            "ts.[WorkDate] < @toExclusive"
        };
        var parameters = new List<object>
        {
            new SqlParameter("@from", from.ToDateTime(TimeOnly.MinValue)),
            new SqlParameter("@toExclusive", to.AddDays(1).ToDateTime(TimeOnly.MinValue))
        };

        if (!string.IsNullOrWhiteSpace(query))
        {
            clauses.Add("""
                (
                    COALESCE(ts.[DocumentNo], N'') LIKE @query
                    OR CONVERT(nvarchar(100), e.[EmployeeCode]) LIKE @query
                    OR CONVERT(nvarchar(300), e.[FullName]) LIKE @query
                    OR LTRIM(RTRIM(CONCAT(e.[FirstNameEn], N' ', e.[LastNameEn]))) LIKE @query
                    OR COALESCE(CONVERT(nvarchar(100), mp.[Code]), N'') LIKE @query
                    OR COALESCE(CONVERT(nvarchar(300), mp.[NameTH]), N'') LIKE @query
                    OR COALESCE(CONVERT(nvarchar(300), mp.[NameEN]), N'') LIKE @query
                )
                """);
            parameters.Add(new SqlParameter("@query", $"%{query.Trim()}%"));
        }

        if (status.Equals("generated", StringComparison.OrdinalIgnoreCase))
            clauses.Add($"{HasDocumentSql} = 1");
        else if (status.Equals("pending", StringComparison.OrdinalIgnoreCase))
            clauses.Add($"{HasDocumentSql} = 0");

        return ($"WHERE {string.Join(" AND ", clauses)}", [.. parameters]);
    }

    private const string FromSql = """
        FROM [dbo].[Timesheets] ts
        LEFT JOIN [dbo].[Employees] e ON ts.[EmployeeId] = e.[Id]
        LEFT JOIN [dbo].[MasterProject] mp ON ts.[ProjectId] = mp.[ProjectId]
        """;

    private const string HasDocumentSql =
        "CASE WHEN NULLIF(LTRIM(RTRIM(ts.[DocumentNo])), N'') IS NULL THEN 0 ELSE 1 END";

    private const string DurationMinutesSql = """
        CASE
            WHEN ts.[EndTime] >= ts.[StartTime]
                THEN DATEDIFF(MINUTE, ts.[StartTime], ts.[EndTime])
            ELSE 1440 + DATEDIFF(MINUTE, ts.[StartTime], ts.[EndTime])
        END
        """;

    private const string SelectSql = $"""
        SELECT
            ts.[Id] AS [TimesheetId],
            COALESCE(CONVERT(nvarchar(100), ts.[DocumentNo]), N'') AS [DocumentNo],
            COALESCE(CONVERT(nvarchar(100), e.[EmployeeCode]), CONVERT(nvarchar(100), ts.[EmployeeId]), N'') AS [EmployeeCode],
            COALESCE(CONVERT(nvarchar(300), e.[FullName]), N'') AS [EmployeeName],
            COALESCE(
                NULLIF(LTRIM(RTRIM(CONCAT(e.[FirstNameEn], N' ', e.[LastNameEn]))), N''),
                CONVERT(nvarchar(300), e.[FullName]),
                N''
            ) AS [EmployeeNameEn],
            CONVERT(datetime2, ts.[WorkDate]) AS [WorkDate],
            ts.[StartTime] AS [StartTime],
            ts.[EndTime] AS [EndTime],
            COALESCE(CONVERT(nvarchar(100), mp.[Code]), N'') AS [ProjectCode],
            COALESCE(
                NULLIF(CONVERT(nvarchar(300), mp.[NameTH]), N''),
                NULLIF(CONVERT(nvarchar(300), mp.[NameEN]), N''),
                CONVERT(nvarchar(100), mp.[Code]),
                CONVERT(nvarchar(100), ts.[ProjectId]),
                N''
            ) AS [ProjectName],
            {DurationMinutesSql} AS [DurationMinutes],
            CAST({HasDocumentSql} AS bit) AS [HasDocument]
        """;

    private static void ValidateRange(DateOnly from, DateOnly to)
    {
        if (to < from)
            throw new ArgumentException(
                "The \"From Date\" cannot be later than the \"To Date\".");
    }
}
