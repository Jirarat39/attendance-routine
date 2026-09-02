using AttendanceRoutine.Api.Models;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AttendanceRoutine.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class AttendanceController(
    AttendanceQueryService queryService,
    ExcelReportService reportService) : ControllerBase
{
    [HttpGet("attendances")]
    public async Task<ActionResult<PagedAttendanceResponse>> Search(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery(Name = "q")] string? query,
        [FromQuery] string status = "all",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var request = new AttendanceSearchRequest(from ?? today, to ?? today, query, status, page, pageSize);
        return Ok(await queryService.SearchAsync(request, cancellationToken));
    }

    [HttpGet("attendances/export")]
    public async Task<IActionResult> Export(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery(Name = "q")] string? query,
        [FromQuery] string status = "all",
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var start = from ?? today;
        var end = to ?? start;
        var bytes = await reportService.BuildAsync(start, end, query, status, cancellationToken);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Attendance_{start:yyyy-MM-dd}_{end:yyyy-MM-dd}.xlsx");
    }

    [HttpPost("reports/daily/{date}")]
    public async Task<IActionResult> GenerateDaily(DateOnly date, CancellationToken cancellationToken)
    {
        var path = await reportService.SaveDailyAsync(date, cancellationToken);
        return Ok(new { date, fileName = Path.GetFileName(path), path });
    }
}
