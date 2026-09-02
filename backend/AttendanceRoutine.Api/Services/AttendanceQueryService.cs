using AttendanceRoutine.Api.Data;
using AttendanceRoutine.Api.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AttendanceRoutine.Api.Services;

public sealed class AttendanceQueryService(
    AttendanceDbContext db,
    DatabaseSchemaResolver schemaResolver)
{
    public async Task<PagedAttendanceResponse> SearchAsync(
        AttendanceSearchRequest request,
        CancellationToken cancellationToken)
    {
        if (request.To < request.From)
            throw new ArgumentException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 10, 200);
        var schema = await schemaResolver.ResolveAsync(cancellationToken);
        var (fromSql, whereSql, parameters) = BuildQueryParts(schema, request.From, request.To, request.Query, request.Status);

        var summarySql = $"""
            SELECT
                COUNT_BIG(1) AS [Total],
                COALESCE(SUM(CASE WHEN {CheckOutExpression(schema)} IS NOT NULL THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END), 0) AS [Completed],
                COALESCE(SUM(CASE WHEN {CheckOutExpression(schema)} IS NULL THEN CAST(1 AS bigint) ELSE CAST(0 AS bigint) END), 0) AS [MissingCheckOut]
            {fromSql}
            {whereSql}
            """;
        var summary = (await db.Database.SqlQueryRaw<AttendanceSummary>(summarySql, [.. parameters])
                .ToListAsync(cancellationToken))
            .Single();

        var dataSql = $"""
            {SelectSql(schema)}
            {fromSql}
            {whereSql}
            ORDER BY {Column("a", schema.CheckInColumn)} DESC, {Column("a", schema.AttendanceIdColumn)} DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;
        var dataParameters = parameters
            .Concat([
                new SqlParameter("@offset", (page - 1) * pageSize),
                new SqlParameter("@pageSize", pageSize)
            ])
            .Cast<object>()
            .ToArray();
        var items = await db.Database.SqlQueryRaw<AttendanceRow>(dataSql, dataParameters)
            .ToListAsync(cancellationToken);

        var totalPages = summary.Total == 0 ? 0 : (long)Math.Ceiling(summary.Total / (double)pageSize);
        return new PagedAttendanceResponse(items, summary, page, pageSize, totalPages);
    }

    public async Task<IReadOnlyList<AttendanceRow>> GetForExportAsync(
        DateOnly from,
        DateOnly to,
        string? query,
        string status,
        int maxRows,
        CancellationToken cancellationToken)
    {
        if (to < from) throw new ArgumentException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");

        var schema = await schemaResolver.ResolveAsync(cancellationToken);
        var (fromSql, whereSql, parameters) = BuildQueryParts(schema, from, to, query, status);
        var sql = $"""
            {SelectSql(schema)}
            {fromSql}
            {whereSql}
            ORDER BY {Column("a", schema.CheckInColumn)}, {Column("a", schema.AttendanceIdColumn)}
            OFFSET 0 ROWS FETCH NEXT @maxRows ROWS ONLY
            """;
        var allParameters = parameters
            .Append(new SqlParameter("@maxRows", Math.Clamp(maxRows, 1, 500_000)))
            .Cast<object>()
            .ToArray();
        return await db.Database.SqlQueryRaw<AttendanceRow>(sql, allParameters).ToListAsync(cancellationToken);
    }

    private static (string FromSql, string WhereSql, object[] Parameters) BuildQueryParts(
        ResolvedDatabaseSchema schema,
        DateOnly from,
        DateOnly to,
        string? query,
        string status)
    {
        var clauses = new List<string>
        {
            $"{Column("a", schema.CheckInColumn)} >= @from",
            $"{Column("a", schema.CheckInColumn)} < @toExclusive"
        };
        var parameters = new List<object>
        {
            new SqlParameter("@from", from.ToDateTime(TimeOnly.MinValue)),
            new SqlParameter("@toExclusive", to.AddDays(1).ToDateTime(TimeOnly.MinValue))
        };

        if (!string.IsNullOrWhiteSpace(query))
        {
            clauses.Add($"(CONVERT(nvarchar(200), {Column("e", schema.EmployeeCodeColumn)}) LIKE @query OR {EmployeeNameExpression(schema)} LIKE @query OR {EmployeeNameEnExpression(schema)} LIKE @query OR {DepartmentExpression()} LIKE @query OR {DepartmentEnExpression()} LIKE @query)");
            parameters.Add(new SqlParameter("@query", $"%{query.Trim()}%"));
        }

        if (status.Equals("complete", StringComparison.OrdinalIgnoreCase))
            clauses.Add($"{CheckOutExpression(schema)} IS NOT NULL");
        else if (status.Equals("missing", StringComparison.OrdinalIgnoreCase))
            clauses.Add($"{CheckOutExpression(schema)} IS NULL");

        var fromSql = $"FROM {schema.AttendanceTable} a LEFT JOIN {schema.EmployeeTable} e ON {Column("a", schema.AttendanceEmployeeKeyColumn)} = {Column("e", schema.EmployeeKeyColumn)} LEFT JOIN [dbo].[Departments] d ON e.[DepartmentId] = d.[Id]";
        return (fromSql, $"WHERE {string.Join(" AND ", clauses)}", [.. parameters]);
    }

    private static string SelectSql(ResolvedDatabaseSchema schema) => $"""
        SELECT
            COALESCE(CONVERT(nvarchar(100), {Column("a", schema.AttendanceIdColumn)}), N'') AS [AttendanceId],
            COALESCE(CONVERT(nvarchar(100), {Column("e", schema.EmployeeCodeColumn)}), CONVERT(nvarchar(100), {Column("a", schema.AttendanceEmployeeKeyColumn)}), N'') AS [EmployeeCode],
            COALESCE({EmployeeNameExpression(schema)}, N'') AS [EmployeeName],
            COALESCE({EmployeeNameEnExpression(schema)}, {EmployeeNameExpression(schema)}, N'') AS [EmployeeNameEn],
            COALESCE({DepartmentExpression()}, N'') AS [Department],
            COALESCE({DepartmentEnExpression()}, {DepartmentExpression()}, N'') AS [DepartmentEn],
            TRY_CONVERT(datetime2, {Column("a", schema.CheckInColumn)}) AS [CheckIn],
            {CheckOutExpression(schema)} AS [CheckOut]
        """;

    private static string EmployeeNameExpression(ResolvedDatabaseSchema schema) => schema.EmployeeNameColumn is null
        ? "CAST(NULL AS nvarchar(300))"
        : $"CONVERT(nvarchar(300), {Column("e", schema.EmployeeNameColumn)})";

    private static string EmployeeNameEnExpression(ResolvedDatabaseSchema schema)
    {
        if (schema.EmployeeFirstNameEnColumn is null
            && schema.EmployeeLastNameEnColumn is null)
            return EmployeeNameExpression(schema);

        var firstName = schema.EmployeeFirstNameEnColumn is null
            ? "N''"
            : $"CONVERT(nvarchar(150), {Column("e", schema.EmployeeFirstNameEnColumn)})";
        var lastName = schema.EmployeeLastNameEnColumn is null
            ? "N''"
            : $"CONVERT(nvarchar(150), {Column("e", schema.EmployeeLastNameEnColumn)})";
        return $"NULLIF(LTRIM(RTRIM(CONCAT({firstName}, N' ', {lastName}))), N'')";
    }

    private static string DepartmentExpression() => "CONVERT(nvarchar(200), d.[Name])";

    private static string DepartmentEnExpression() => "NULLIF(CONVERT(nvarchar(200), d.[NameEn]), N'')";

    private static string CheckOutExpression(ResolvedDatabaseSchema schema) => schema.CheckOutColumn is null
        ? "CAST(NULL AS datetime2)"
        : $"TRY_CONVERT(datetime2, {Column("a", schema.CheckOutColumn)})";

    private static string Column(string alias, string name) =>
        $"{alias}.{DatabaseSchemaResolver.QuoteIdentifier(name)}";
}
