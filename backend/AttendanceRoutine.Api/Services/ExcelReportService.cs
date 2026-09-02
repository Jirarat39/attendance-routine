using AttendanceRoutine.Api.Models;
using ClosedXML.Excel;

namespace AttendanceRoutine.Api.Services;

public sealed class ExcelReportService(
    AttendanceQueryService queryService,
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
            from, to, query, status, settings.MaxExportRows, cancellationToken);

        using var workbook = new XLWorkbook();
        workbook.Properties.Title = $"Attendance report {from:yyyy-MM-dd} - {to:yyyy-MM-dd}";
        workbook.Properties.Subject = "Employee check-in/check-out report";
        workbook.Properties.Author = "HR Report Scheduler";
        var sheet = workbook.Worksheets.Add("Attendance");

        sheet.Range("A1:G1").Merge();
        sheet.Cell("A1").Value = "รายงานการเช็คอิน / เช็คเอาท์";
        sheet.Cell("A2").Value = "ช่วงวันที่";
        sheet.Cell("B2").Value = from == to ? from.ToString("dd/MM/yyyy") : $"{from:dd/MM/yyyy} - {to:dd/MM/yyyy}";
        sheet.Cell("F2").Value = "สร้างเมื่อ";
        sheet.Cell("G2").Value = DateTime.Now;
        sheet.Cell("G2").Style.DateFormat.Format = "dd/mm/yyyy hh:mm";

        var headers = new[] { "รหัสรายการ", "รหัสพนักงาน", "ชื่อพนักงาน", "แผนก", "เช็คอิน", "เช็คเอาท์", "สถานะ" };
        for (var index = 0; index < headers.Length; index++)
            sheet.Cell(4, index + 1).Value = headers[index];

        for (var index = 0; index < rows.Count; index++)
        {
            var rowNumber = index + 5;
            var row = rows[index];
            sheet.Cell(rowNumber, 1).SetValue(row.AttendanceId);
            sheet.Cell(rowNumber, 2).SetValue(row.EmployeeCode);
            sheet.Cell(rowNumber, 3).SetValue(row.EmployeeName);
            sheet.Cell(rowNumber, 4).SetValue(row.Department);
            if (row.CheckIn.HasValue) sheet.Cell(rowNumber, 5).SetValue(row.CheckIn.Value);
            if (row.CheckOut.HasValue) sheet.Cell(rowNumber, 6).SetValue(row.CheckOut.Value);
            sheet.Cell(rowNumber, 7).SetValue(row.CheckOut.HasValue ? "ครบถ้วน" : "ยังไม่เช็คเอาท์");
        }

        var navy = XLColor.FromHtml("#14324A");
        var cyan = XLColor.FromHtml("#10B8A6");
        var pale = XLColor.FromHtml("#E9F7F5");
        sheet.Range("A1:G1").Style
            .Font.SetBold().Font.SetFontSize(18).Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(navy)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left)
            .Alignment.SetVertical(XLAlignmentVerticalValues.Center);
        sheet.Row(1).Height = 34;
        sheet.Range("A4:G4").Style
            .Font.SetBold().Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(cyan)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        sheet.SheetView.FreezeRows(4);
        sheet.Range("A4:G4").SetAutoFilter();
        if (rows.Count > 0)
        {
            var dataRange = sheet.Range(5, 1, rows.Count + 4, 7);
            dataRange.Style.Border.SetBottomBorder(XLBorderStyleValues.Hair);
            dataRange.Style.Border.SetBottomBorderColor(XLColor.LightGray);
            dataRange.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Center);
            for (var rowNumber = 5; rowNumber <= rows.Count + 4; rowNumber += 2)
                sheet.Range(rowNumber, 1, rowNumber, 7).Style.Fill.SetBackgroundColor(pale);
        }
        sheet.Column(5).Style.DateFormat.Format = "dd/mm/yyyy hh:mm:ss";
        sheet.Column(6).Style.DateFormat.Format = "dd/mm/yyyy hh:mm:ss";
        sheet.Columns(1, 7).AdjustToContents();
        sheet.Column(1).Width = Math.Min(sheet.Column(1).Width, 20);
        sheet.Column(2).Width = Math.Min(Math.Max(sheet.Column(2).Width, 14), 20);
        sheet.Column(3).Width = Math.Min(Math.Max(sheet.Column(3).Width, 24), 40);
        sheet.Column(4).Width = Math.Min(Math.Max(sheet.Column(4).Width, 18), 32);
        sheet.Column(5).Width = 22;
        sheet.Column(6).Width = 22;
        sheet.Column(7).Width = 20;
        sheet.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        sheet.PageSetup.FitToPages(1, 0);
        sheet.PageSetup.SetRowsToRepeatAtTop(1, 4);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<string> SaveDailyAsync(DateOnly reportDate, CancellationToken cancellationToken)
        => await SaveRangeAsync(reportDate, reportDate, cancellationToken);

    public async Task<string> SaveRangeAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var settings = await settingsStore.GetAsync(cancellationToken);
        var bytes = await BuildAsync(from, to, null, "all", cancellationToken);
        var directory = Path.IsPathRooted(settings.Attendance.ExportDirectory)
            ? settings.Attendance.ExportDirectory
            : Path.Combine(environment.ContentRootPath, settings.Attendance.ExportDirectory);
        Directory.CreateDirectory(directory);
        var datePart = from == to
            ? $"{from:yyyy-MM-dd}"
            : $"{from:yyyy-MM-dd}_to_{to:yyyy-MM-dd}";
        var timeZone = DailyReportWorker.ResolveTimeZone(settings.TimeZoneId);
        var createdAt = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);
        var createdPart = createdAt.ToString("yyyyMMdd_HHmmss_fff");
        var baseFileName = $"Attendance_{datePart}_{createdPart}";
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
