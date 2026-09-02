namespace AttendanceRoutine.Api.Models;

public sealed record LoginRequest(
    string EmployeeCode,
    string Password);

public sealed record AuthUserResponse(
    string EmployeeCode,
    string FullName,
    string FullNameEn,
    string Role,
    bool HasPhoto);

public sealed record ProfilePhoto(
    byte[] Content,
    string ContentType);

public enum AuthenticationStatus
{
    Success,
    InvalidCredentials,
    AccessDenied
}

public sealed record AuthenticationResult(
    AuthenticationStatus Status,
    AuthUserResponse? User = null);
