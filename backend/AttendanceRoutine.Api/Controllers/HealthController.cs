using AttendanceRoutine.Api.Data;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceRoutine.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        // Simple health check - just verify app is running
        // Database checks are deferred to actual API endpoints
        return Ok(new { status = "healthy" });
    }
}

