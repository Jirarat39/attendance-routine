using AttendanceRoutine.Api.Models;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AttendanceRoutine.Api.Controllers;

[ApiController]
[Route("api/timesheets")]
public sealed class TimesheetController(
    TimesheetQueryService queryService,
    TimesheetExcelService excelService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedTimesheetResponse>> Search(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery(Name = "q")] string? query,
        [FromQuery] string status = "all",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var start = from ?? today;
        var end = to ?? start;
        if (start > end)
            return BadRequest(new
            {
                message = "The \"From Date\" cannot be later than the \"To Date\"."
            });

        return Ok(await queryService.SearchAsync(
            new TimesheetSearchRequest(start, end, query, status, page, pageSize),
            cancellationToken));
    }

    [HttpGet("export")]
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
        if (start > end)
            return BadRequest(new
            {
                message = "The \"From Date\" cannot be later than the \"To Date\"."
            });

        var bytes = await excelService.BuildAsync(
            start,
            end,
            query,
            status,
            cancellationToken);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Timesheet_{start:yyyy-MM-dd}_{end:yyyy-MM-dd}.xlsx");
    }
}
