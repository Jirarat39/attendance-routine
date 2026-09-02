using System.Data;
using AttendanceRoutine.Api.Auth;
using AttendanceRoutine.Api.Models;
using Microsoft.Data.SqlClient;

namespace AttendanceRoutine.Api.Services;

public sealed class AuthService(
    IConfiguration configuration,
    IWebHostEnvironment environment)
{
    private const long MaximumProfilePhotoBytes = 10 * 1024 * 1024;

    private readonly string _connectionString =
        configuration.GetConnectionString("AttendanceDb")
        ?? throw new InvalidOperationException("AttendanceDb connection string is not configured.");
    private readonly string _contentRootPath = environment.ContentRootPath;
    private readonly string? _configuredPhotoRootPath =
        configuration["ProfilePhotos:RootPath"];

    public async Task<AuthenticationResult> AuthenticateAsync(
        string employeeCode,
        string password,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandTimeout = 15;
        command.CommandText = """
            SELECT TOP (1)
                CONVERT(nvarchar(100), [EmployeeCode]) AS [EmployeeCode],
                CONVERT(nvarchar(300), [FullName]) AS [FullName],
                COALESCE(
                    NULLIF(LTRIM(RTRIM(CONCAT([FirstNameEn], N' ', [LastNameEn]))), N''),
                    CONVERT(nvarchar(300), [FullName])
                ) AS [FullNameEn],
                CONVERT(nvarchar(max), [PasswordHash]) AS [PasswordHash],
                CONVERT(nvarchar(100), [Role]) AS [Role],
                CAST([IsActive] AS bit) AS [IsActive],
                CAST(CASE
                    WHEN NULLIF(LTRIM(RTRIM([PhotoPath])), N'') IS NOT NULL
                      OR NULLIF(LTRIM(RTRIM([PhotoFileName])), N'') IS NOT NULL
                    THEN 1 ELSE 0
                END AS bit) AS [HasPhoto]
            FROM [dbo].[Employees]
            WHERE [EmployeeCode] = @employeeCode;
            """;
        command.Parameters.Add(
            new SqlParameter("@employeeCode", SqlDbType.NVarChar, 100)
            {
                Value = employeeCode
            });

        await using var reader = await command.ExecuteReaderAsync(
            CommandBehavior.SingleRow,
            cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return new AuthenticationResult(AuthenticationStatus.InvalidCredentials);

        var storedHash = reader.GetString(3);
        if (!PasswordHasher.Verify(password, storedHash))
            return new AuthenticationResult(AuthenticationStatus.InvalidCredentials);

        var role = reader.GetString(4).Trim();
        var isActive = reader.GetBoolean(5);
        if (!isActive || !string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            return new AuthenticationResult(AuthenticationStatus.AccessDenied);

        return new AuthenticationResult(
            AuthenticationStatus.Success,
            new AuthUserResponse(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                "Admin",
                reader.GetBoolean(6)));
    }

    public async Task<AuthUserResponse?> GetProfileAsync(
        string employeeCode,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandTimeout = 15;
        command.CommandText = """
            SELECT TOP (1)
                CONVERT(nvarchar(100), [EmployeeCode]) AS [EmployeeCode],
                CONVERT(nvarchar(300), [FullName]) AS [FullName],
                COALESCE(
                    NULLIF(LTRIM(RTRIM(CONCAT([FirstNameEn], N' ', [LastNameEn]))), N''),
                    CONVERT(nvarchar(300), [FullName])
                ) AS [FullNameEn],
                CONVERT(nvarchar(100), [Role]) AS [Role],
                CAST([IsActive] AS bit) AS [IsActive],
                CAST(CASE
                    WHEN NULLIF(LTRIM(RTRIM([PhotoPath])), N'') IS NOT NULL
                      OR NULLIF(LTRIM(RTRIM([PhotoFileName])), N'') IS NOT NULL
                    THEN 1 ELSE 0
                END AS bit) AS [HasPhoto]
            FROM [dbo].[Employees]
            WHERE [EmployeeCode] = @employeeCode;
            """;
        command.Parameters.Add(
            new SqlParameter("@employeeCode", SqlDbType.NVarChar, 100)
            {
                Value = employeeCode
            });

        await using var reader = await command.ExecuteReaderAsync(
            CommandBehavior.SingleRow,
            cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)
            || !reader.GetBoolean(4)
            || !string.Equals(reader.GetString(3).Trim(), "Admin", StringComparison.OrdinalIgnoreCase))
            return null;

        return new AuthUserResponse(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            "Admin",
            reader.GetBoolean(5));
    }

    public async Task<ProfilePhoto?> GetProfilePhotoAsync(
        string employeeCode,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandTimeout = 15;
        command.CommandText = """
            SELECT TOP (1)
                CONVERT(nvarchar(255), [PhotoContentType]) AS [PhotoContentType],
                CONVERT(nvarchar(255), [PhotoFileName]) AS [PhotoFileName],
                CONVERT(nvarchar(2000), [PhotoPath]) AS [PhotoPath]
            FROM [dbo].[Employees]
            WHERE [EmployeeCode] = @employeeCode
              AND [IsActive] = 1;
            """;
        command.Parameters.Add(
            new SqlParameter("@employeeCode", SqlDbType.NVarChar, 100)
            {
                Value = employeeCode
            });

        await using var reader = await command.ExecuteReaderAsync(
            CommandBehavior.SingleRow,
            cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var storedContentType = reader.IsDBNull(0) ? null : reader.GetString(0).Trim();
        var fileName = reader.IsDBNull(1) ? null : reader.GetString(1).Trim();
        var storedPath = reader.IsDBNull(2) ? null : reader.GetString(2).Trim();
        var resolvedPath = ResolveProfilePhotoPath(storedPath, fileName);
        if (resolvedPath is null)
            return null;

        var fileInfo = new FileInfo(resolvedPath);
        if (!fileInfo.Exists || fileInfo.Length is <= 0 or > MaximumProfilePhotoBytes)
            return null;

        var contentType = ResolveImageContentType(storedContentType, fileInfo.Extension);
        if (contentType is null)
            return null;

        return new ProfilePhoto(
            await File.ReadAllBytesAsync(resolvedPath, cancellationToken),
            contentType);
    }

    private string? ResolveProfilePhotoPath(string? storedPath, string? fileName)
    {
        var storedCandidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(storedPath))
        {
            storedCandidates.Add(storedPath);
            if (!string.IsNullOrWhiteSpace(fileName))
                storedCandidates.Add(Path.Combine(storedPath, fileName));
        }
        if (!string.IsNullOrWhiteSpace(fileName))
            storedCandidates.Add(fileName);

        var roots = new[]
        {
            _configuredPhotoRootPath,
            _contentRootPath,
            Path.Combine(_contentRootPath, "wwwroot"),
            AppContext.BaseDirectory
        }.Where(path => !string.IsNullOrWhiteSpace(path));

        foreach (var storedCandidate in storedCandidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (Path.IsPathFullyQualified(storedCandidate)
                && TryGetExistingFilePath(storedCandidate, out var absolutePath))
                return absolutePath;

            foreach (var root in roots)
            {
                var candidate = Path.Combine(root!, storedCandidate.TrimStart(
                    Path.DirectorySeparatorChar,
                    Path.AltDirectorySeparatorChar));
                if (TryGetExistingFilePath(candidate, out var relativePath))
                    return relativePath;
            }
        }

        return null;
    }

    private static bool TryGetExistingFilePath(string candidate, out string path)
    {
        try
        {
            path = Path.GetFullPath(candidate);
            return File.Exists(path);
        }
        catch (Exception exception) when (
            exception is ArgumentException
                or NotSupportedException
                or PathTooLongException)
        {
            path = "";
            return false;
        }
    }

    private static string? ResolveImageContentType(
        string? storedContentType,
        string extension)
    {
        var normalizedStoredType = storedContentType?.ToLowerInvariant();
        if (normalizedStoredType is
            "image/jpeg" or
            "image/png" or
            "image/gif" or
            "image/webp")
            return normalizedStoredType;

        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => null
        };
    }
}
