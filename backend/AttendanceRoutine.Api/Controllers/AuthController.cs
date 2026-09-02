using System.Security.Claims;
using AttendanceRoutine.Api.Models;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AttendanceRoutine.Api.Controllers;

[ApiController]
[Route("api/auth")]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class AuthController(AuthService authService) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthUserResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var employeeCode = request.EmployeeCode?.Trim() ?? "";
        if (employeeCode.Length is < 1 or > 100
            || string.IsNullOrWhiteSpace(request.Password)
            || request.Password.Length > 256)
            return Unauthorized(new
            {
                code = "INVALID_CREDENTIALS",
                message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            });

        var result = await authService.AuthenticateAsync(
            employeeCode,
            request.Password,
            cancellationToken);
        if (result.Status == AuthenticationStatus.InvalidCredentials)
            return Unauthorized(new
            {
                code = "INVALID_CREDENTIALS",
                message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            });
        if (result.Status == AuthenticationStatus.AccessDenied)
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                code = "ACCESS_DENIED",
                message = "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบ"
            });

        var user = result.User!;
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.EmployeeCode),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("full_name_en", user.FullNameEn),
            new Claim("has_photo", user.HasPhoto.ToString()),
            new Claim(ClaimTypes.Role, user.Role)
        };
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity(
                claims,
                CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties
            {
                IsPersistent = false,
                AllowRefresh = false,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
            });

        return Ok(user);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserResponse>> Me(CancellationToken cancellationToken)
    {
        var employeeCode = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var fullNameEn = User.FindFirstValue("full_name_en");
        var hasPhotoClaim = User.FindFirstValue("has_photo");
        if (!string.IsNullOrWhiteSpace(fullNameEn)
            && bool.TryParse(hasPhotoClaim, out var hasPhoto))
        {
            return Ok(new AuthUserResponse(
                employeeCode,
                User.FindFirstValue(ClaimTypes.Name) ?? "",
                fullNameEn,
                User.FindFirstValue(ClaimTypes.Role) ?? "",
                hasPhoto));
        }

        var profile = await authService.GetProfileAsync(employeeCode, cancellationToken);
        return profile is null ? Unauthorized() : Ok(profile);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("photo")]
    public async Task<IActionResult> Photo(CancellationToken cancellationToken)
    {
        var employeeCode = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(employeeCode))
            return Unauthorized();

        var photo = await authService.GetProfilePhotoAsync(employeeCode, cancellationToken);
        return photo is null
            ? NotFound()
            : File(photo.Content, photo.ContentType);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
