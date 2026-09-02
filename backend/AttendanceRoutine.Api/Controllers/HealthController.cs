using AttendanceRoutine.Api.Data;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceRoutine.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController(
    AttendanceDbContext db,
    DatabaseSchemaResolver schemaResolver) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var canConnect = await db.Database.CanConnectAsync(cancellationToken);
        if (!canConnect) return StatusCode(503, new { status = "unhealthy", database = "unreachable" });
        var schema = await schemaResolver.ResolveAsync(cancellationToken);
        return Ok(new
        {
            status = "healthy",
            database = "connected",
            attendanceTable = schema.AttendanceTable,
            employeeTable = schema.EmployeeTable
        });
    }
}

