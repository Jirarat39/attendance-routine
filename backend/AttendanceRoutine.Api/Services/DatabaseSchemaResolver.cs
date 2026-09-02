using System.Data;
using System.Text.RegularExpressions;
using AttendanceRoutine.Api.Data;
using AttendanceRoutine.Api.Models;
using AttendanceRoutine.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace AttendanceRoutine.Api.Services;

public sealed partial class DatabaseSchemaResolver(
    AttendanceDbContext db,
    IOptions<DatabaseMappingOptions> options,
    IMemoryCache cache)
{
    private const string CacheKey = "resolved-database-schema";
    private readonly DatabaseMappingOptions _options = options.Value;

    public Task<ResolvedDatabaseSchema> ResolveAsync(CancellationToken cancellationToken) =>
        cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
            return await ResolveCoreAsync(cancellationToken);
        })!;

    private async Task<ResolvedDatabaseSchema> ResolveCoreAsync(CancellationToken cancellationToken)
    {
        var attendanceTableName = LastIdentifier(_options.AttendanceTable);
        var employeeTableName = LastIdentifier(_options.EmployeeTable);
        
        // Check if using in-memory database (InMemory doesn't support INFORMATION_SCHEMA)
        if (db.Database.IsInMemory())
        {
            return CreateFallbackSchema(attendanceTableName, employeeTableName);
        }
        
        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME IN (@attendanceTable, @employeeTable)
            ORDER BY TABLE_NAME, ORDINAL_POSITION;
            """;
        AddParameter(command, "@attendanceTable", attendanceTableName);
        AddParameter(command, "@employeeTable", employeeTableName);

        var tables = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var table = reader.GetString(0);
            var column = reader.GetString(1);
            if (!tables.TryGetValue(table, out var columns))
            {
                columns = [];
                tables[table] = columns;
            }
            columns.Add(column);
        }

        if (!tables.TryGetValue(attendanceTableName, out var attendanceColumns))
            throw new InvalidOperationException($"ไม่พบตาราง '{_options.AttendanceTable}' ในฐานข้อมูล");
        if (!tables.TryGetValue(employeeTableName, out var employeeColumns))
            throw new InvalidOperationException($"ไม่พบตาราง '{_options.EmployeeTable}' ในฐานข้อมูล");

        var attendanceEmployeeKey = Pick(
            attendanceColumns,
            _options.AttendanceEmployeeKeyColumn,
            true,
            "EmployeeId", "EmpId", "EmployeeCode", "EmployeeNo", "EmpCode", "CardNo", "BadgeNo", "EnrollNumber", "UserId")!;
        var employeeKey = Pick(
            employeeColumns,
            _options.EmployeeKeyColumn,
            true,
            attendanceEmployeeKey, "Id", "EmployeeId", "EmpId", "EmployeeCode", "EmployeeNo", "EmpCode", "CardNo", "UserId")!;

        return new ResolvedDatabaseSchema(
            QuoteQualified(_options.AttendanceTable),
            QuoteQualified(_options.EmployeeTable),
            Pick(attendanceColumns, _options.AttendanceIdColumn, false, "AttendanceId", "Id", "RecordId", "LogId") ?? attendanceEmployeeKey,
            attendanceEmployeeKey,
            Pick(attendanceColumns, _options.CheckInColumn, true, "CheckIn", "CheckInTime", "TimeIn", "InTime", "ClockIn", "DateTimeIn", "ScanIn", "Checkin")!,
            Pick(attendanceColumns, _options.CheckOutColumn, false, "CheckOut", "CheckOutTime", "TimeOut", "OutTime", "ClockOut", "DateTimeOut", "ScanOut", "Checkout"),
            employeeKey,
            Pick(employeeColumns, _options.EmployeeCodeColumn, false, "EmployeeCode", "EmployeeNo", "EmpCode", "Code", "CardNo") ?? employeeKey,
            Pick(employeeColumns, _options.EmployeeNameColumn, false, "FullName", "EmployeeName", "EmpName", "DisplayName", "Name", "FirstName"),
            Pick(employeeColumns, string.Empty, false, "FirstNameEn", "FirstNameEN", "EnglishFirstName"),
            Pick(employeeColumns, string.Empty, false, "LastNameEn", "LastNameEN", "EnglishLastName"),
            Pick(employeeColumns, _options.DepartmentColumn, false, "Department", "DepartmentName", "DeptName", "Dept", "Section", "Division"));
    }

    private static string? Pick(
        IReadOnlyCollection<string> columns,
        string configured,
        bool required,
        params string[] candidates)
    {
        var requested = string.IsNullOrWhiteSpace(configured)
            ? candidates
            : [configured, .. candidates];
        foreach (var candidate in requested.Where(value => !string.IsNullOrWhiteSpace(value)))
        {
            var match = columns.FirstOrDefault(column => column.Equals(candidate, StringComparison.OrdinalIgnoreCase));
            if (match is not null) return match;
        }

        if (required)
            throw new InvalidOperationException(
                $"ไม่พบคอลัมน์ที่จำเป็น (ลองค้นหา: {string.Join(", ", requested)}). กรุณากำหนด DatabaseMapping ใน appsettings.Local.json");
        return null;
    }

    public static string QuoteIdentifier(string identifier)
    {
        var clean = identifier.Trim().Trim('[', ']');
        if (!SafeIdentifier().IsMatch(clean))
            throw new InvalidOperationException($"ชื่อ SQL identifier ไม่ถูกต้อง: {identifier}");
        return $"[{clean}]";
    }

    private static string QuoteQualified(string value) =>
        string.Join('.', value.Split('.', StringSplitOptions.RemoveEmptyEntries).Select(QuoteIdentifier));

    private static string LastIdentifier(string value) => value.Split('.').Last().Trim().Trim('[', ']');

    private static void AddParameter(System.Data.Common.DbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    /// <summary>
    /// Create a fallback schema for in-memory database (which doesn't support INFORMATION_SCHEMA queries)
    /// </summary>
    private ResolvedDatabaseSchema CreateFallbackSchema(string attendanceTableName, string employeeTableName)
    {
        return new ResolvedDatabaseSchema(
            QuoteQualified(_options.AttendanceTable),
            QuoteQualified(_options.EmployeeTable),
            _options.AttendanceIdColumn ?? "AttendanceId",
            _options.AttendanceEmployeeKeyColumn ?? "EmployeeId",
            _options.CheckInColumn ?? "CheckIn",
            _options.CheckOutColumn ?? "CheckOut",
            _options.EmployeeKeyColumn ?? "EmployeeId",
            _options.EmployeeCodeColumn ?? "EmployeeCode",
            _options.EmployeeNameColumn ?? "Name",
            null,  // EmployeeFirstNameEnColumn
            null,  // EmployeeLastNameEnColumn
            _options.DepartmentColumn ?? null  // DepartmentColumn
        );
    }

    [GeneratedRegex("^[A-Za-z0-9_]+$")]
    private static partial Regex SafeIdentifier();
}
