using AttendanceRoutine.Api.Models;
using ClosedXML.Excel;

namespace AttendanceRoutine.Api.Services;

public sealed class TimesheetExcelService(
    TimesheetQueryService queryService,
    ReportSettingsStore settingsStore,
    IWebHostEnvironment environment)
{
    public async Task<byte[]> BuildAsync(
        DateOnly from,
        DateOnly to,
        string? query,
        string status,
        CancellationToken cancellationToken)
    {
        var settings = await settingsStore.GetAsync(cancellationToken);
        var rows = await queryService.GetForExportAsync(
            from,
            to,
            query,
            status,
            settings.MaxExportRows,
            cancellationToken);

        using var workbook = new XLWorkbook();
        workbook.Properties.Title = $"Timesheet report {from:yyyy-MM-dd} - {to:yyyy-MM-dd}";
        workbook.Properties.Subject = "Employee timesheet report";
        workbook.Properties.Author = "HR Report Scheduler";
        var sheet = workbook.Worksheets.Add("Timesheet");

        sheet.Range("A1:J1").Merge();
        sheet.Cell("A1").Value = "รายงาน Timesheet";
        sheet.Cell("A2").Value = "ช่วงวันที่";
        sheet.Cell("B2").Value = from == to
            ? from.ToString("dd/MM/yyyy")
            : $"{from:dd/MM/yyyy} - {to:dd/MM/yyyy}";
        sheet.Cell("I2").Value = "สร้างเมื่อ";
        sheet.Cell("J2").Value = DateTime.Now;
        sheet.Cell("J2").Style.DateFormat.Format = "dd/mm/yyyy hh:mm";

        var headers = new[]
        {
            "เลขเอกสาร",
            "รหัสพนักงาน",
            "ชื่อพนักงาน",
            "วันที่ทำงาน",
            "เวลาเริ่ม",
            "เวลาสิ้นสุด",
            "โครงการ",
            "ชื่อโครงการ",
            "ชั่วโมง",
            "สถานะเอกสาร"
        };
        for (var index = 0; index < headers.Length; index++)
            sheet.Cell(4, index + 1).Value = headers[index];

        for (var index = 0; index < rows.Count; index++)
        {
            var rowNumber = index + 5;
            var row = rows[index];
            sheet.Cell(rowNumber, 1).Value = row.DocumentNo;
            sheet.Cell(rowNumber, 2).Value = row.EmployeeCode;
            sheet.Cell(rowNumber, 3).Value = row.EmployeeName;
            sheet.Cell(rowNumber, 4).Value = row.WorkDate;
            sheet.Cell(rowNumber, 5).Value = row.StartTime;
            sheet.Cell(rowNumber, 6).Value = row.EndTime;
            sheet.Cell(rowNumber, 7).Value = row.ProjectCode;
            sheet.Cell(rowNumber, 8).Value = row.ProjectName;
            sheet.Cell(rowNumber, 9).Value = row.DurationMinutes / 60d;
            sheet.Cell(rowNumber, 10).Value = row.HasDocument
                ? "สร้างเอกสารแล้ว"
                : "รอสร้างเอกสาร";
        }

        var navy = XLColor.FromHtml("#14324A");
        var cyan = XLColor.FromHtml("#10B8A6");
        var pale = XLColor.FromHtml("#E9F7F5");
        sheet.Range("A1:J1").Style
            .Font.SetBold().Font.SetFontSize(18).Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(navy);
        sheet.Row(1).Height = 34;
        sheet.Range("A4:J4").Style
            .Font.SetBold().Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(cyan)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        sheet.SheetView.FreezeRows(4);
        sheet.Range("A4:J4").SetAutoFilter();
        if (rows.Count > 0)
        {
            for (var rowNumber = 5; rowNumber <= rows.Count + 4; rowNumber += 2)
                sheet.Range(rowNumber, 1, rowNumber, 10).Style.Fill.SetBackgroundColor(pale);
        }
        sheet.Column(4).Style.DateFormat.Format = "dd/mm/yyyy";
        sheet.Columns(5, 6).Style.DateFormat.Format = "hh:mm";
        sheet.Column(9).Style.NumberFormat.Format = "0.00";
        sheet.Columns(1, 10).AdjustToContents();
        sheet.Column(1).Width = Math.Min(Math.Max(sheet.Column(1).Width, 16), 26);
        sheet.Column(3).Width = Math.Min(Math.Max(sheet.Column(3).Width, 24), 40);
        sheet.Column(8).Width = Math.Min(Math.Max(sheet.Column(8).Width, 24), 45);
        sheet.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        sheet.PageSetup.FitToPages(1, 0);
        sheet.PageSetup.SetRowsToRepeatAtTop(1, 4);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<string> SaveRangeAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var settings = await settingsStore.GetAsync(cancellationToken);
        var bytes = await BuildAsync(from, to, null, "all", cancellationToken);
        var directory = Path.IsPathRooted(settings.Timesheet.ExportDirectory)
            ? settings.Timesheet.ExportDirectory
            : Path.Combine(environment.ContentRootPath, settings.Timesheet.ExportDirectory);
        Directory.CreateDirectory(directory);
        var datePart = from == to
            ? $"{from:yyyy-MM-dd}"
            : $"{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}";
        var timeZone = DailyReportWorker.ResolveTimeZone(settings.TimeZoneId);
        var createdAt = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);
        var createdPart = createdAt.ToString("yyyyMMdd_HHmmss_fff");
        var baseFileName = $"Timesheet_{datePart}_{createdPart}";
        var tempPath = Path.Combine(directory, $".{Guid.NewGuid():N}.tmp");
        await File.WriteAllBytesAsync(tempPath, bytes, cancellationToken);

        for (var suffix = 0; ; suffix++)
        {
            var suffixPart = suffix == 0 ? "" : $"_{suffix:00}";
            var finalPath = Path.Combine(directory, $"{baseFileName}{suffixPart}.xlsx");
            try
            {
                File.Move(tempPath, finalPath);
                return finalPath;
            }
            catch (IOException) when (File.Exists(finalPath))
            {
                // Another report used the same timestamp; try the next sequence number.
            }
        }
    }
}
