using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Report;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Services;

// Renders the report summaries produced by ReportService into styled .xlsx
// workbooks. The hospital name in the header comes from Settings → System.
public class ReportExportService : IReportExportService
{
    private const string HeaderGreen = "#1A6A36";
    private const string ZebraGreen = "#F5FBF7";
    private static readonly string[] MonthNames =
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    private readonly IReportService _reports;
    private readonly ISystemSettingsService _settings;
    private readonly ApplicationDbContext _db;

    public ReportExportService(IReportService reports, ISystemSettingsService settings, ApplicationDbContext db)
    {
        _reports = reports;
        _settings = settings;
        _db = db;
    }

    public async Task<byte[]> ExportConsumptionAsync(ReportFilterDto filter)
    {
        var data = await _reports.GetConsumptionReportAsync(filter);
        var org = (await _settings.GetAsync()).OrganizationName;

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Consumption");
        var row = WriteDocumentHeader(ws, org, $"Consumption Report — {filter.Year?.ToString() ?? "All Years"}", lastCol: 4);

        row = WriteKeyValueBlock(ws, row, "Summary", new (string, object)[]
        {
            ("Total quantity consumed", data.TotalQuantity),
            ("Unique items", data.UniqueItems),
            ("Peak month", data.PeakMonth is int pm and >= 1 and <= 12 ? MonthNames[pm - 1] : "—"),
            ("Peak month quantity", data.PeakMonthQty ?? 0),
            ("Avg. monthly consumption", data.AvgMonthlyConsumption ?? 0),
        });

        row = WriteTable(ws, row, "Monthly Consumption",
            ["Month", "Total Quantity"],
            data.ByMonth.Select(m => new object[] { m.Month is >= 1 and <= 12 ? MonthNames[m.Month - 1] : m.Month.ToString(), m.TotalQuantity }));

        WriteTable(ws, row, "Top Items",
            ["Item", "Category", "Total Quantity", "Unit"],
            data.TopItems.Select(t => new object[] { t.ItemName, t.Category, t.TotalQuantity, t.Unit }));

        ws.Columns().AdjustToContents();
        return ToBytes(wb);
    }

    public async Task<byte[]> ExportProcurementAsync(ReportFilterDto filter)
    {
        var data = await _reports.GetProcurementReportAsync(filter);
        var org = (await _settings.GetAsync()).OrganizationName;

        var range = filter.StartDate.HasValue || filter.EndDate.HasValue
            ? $"{filter.StartDate:yyyy-MM-dd} to {filter.EndDate:yyyy-MM-dd}"
            : "All Time";

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Procurement");
        var row = WriteDocumentHeader(ws, org, $"Procurement Report — {range}", lastCol: 4);

        row = WriteKeyValueBlock(ws, row, "Summary", new (string, object)[]
        {
            ("Total requests", data.TotalRequests),
            ("Fully approved", data.FullyApproved),
            ("Purchase orders", data.TotalPOs),
            ("Delivered POs", data.DeliveredPOs),
            ("Total PO amount (PHP)", data.TotalPOAmount),
        });

        row = WriteTable(ws, row, "Requests by Status",
            ["Status", "Count"],
            data.ByStatus.Select(kv => new object[] { kv.Key, kv.Value }));

        WriteTable(ws, row, "Top Suppliers",
            ["Supplier", "PO Count", "Total Amount (PHP)"],
            data.TopSuppliers.Select(s => new object[] { s.SupplierName, s.PoCount, s.TotalAmount }));

        ws.Columns().AdjustToContents();
        return ToBytes(wb);
    }

    public async Task<byte[]> ExportForecastAccuracyAsync(ReportFilterDto filter)
    {
        var data = await _reports.GetForecastAccuracyReportAsync(filter);
        var org = (await _settings.GetAsync()).OrganizationName;

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Forecast Accuracy");
        var row = WriteDocumentHeader(ws, org, $"Forecast Accuracy Report — {filter.Year?.ToString() ?? "All Years"}", lastCol: 8);

        row = WriteKeyValueBlock(ws, row, "Summary", new (string, object)[]
        {
            ("Total forecasts", data.TotalForecasts),
            ("Items with forecast", data.ItemsWithForecast),
            ("Moving average forecasts", data.MovingAverageCount),
            ("Exp. smoothing forecasts", data.ExpSmoothingCount),
            ("Evaluated forecasts", data.EvaluatedForecasts),
            ("Overall MAE", data.OverallMae ?? 0),
        });

        WriteTable(ws, row, "Per-Item Forecasts",
            ["Item", "Method", "Latest Forecast", "Suggested Reorder", "Current Stock", "Below Reorder", "Evaluated", "MAE"],
            data.ItemForecasts.Select(f => new object[]
            {
                f.ItemName, f.Method,
                f.LatestForecast ?? 0, f.SuggestedReorder ?? 0, f.CurrentStock,
                f.IsBelowReorder ? "Yes" : "No", f.EvaluatedForecasts, f.MeanAbsoluteError ?? 0,
            }));

        ws.Columns().AdjustToContents();
        return ToBytes(wb);
    }

    public async Task<byte[]> ExportInventorySnapshotAsync()
    {
        var org = (await _settings.GetAsync()).OrganizationName;

        var items = await _db.InventoryItems.AsNoTracking()
            .Include(i => i.Category)
            .Where(i => i.IsActive)
            .OrderBy(i => i.Category.Name).ThenBy(i => i.Name)
            .ToListAsync();

        var batches = await _db.ItemBatches.AsNoTracking()
            .Include(b => b.InventoryItem)
            .Where(b => b.RemainingQuantity > 0)
            .OrderBy(b => b.ExpirationDate == null).ThenBy(b => b.ExpirationDate)
            .ToListAsync();

        using var wb = new XLWorkbook();

        // Sheet 1: stock on hand
        var ws = wb.AddWorksheet("Stock on Hand");
        var row = WriteDocumentHeader(ws, org, "Inventory Stock Snapshot", lastCol: 7);
        WriteTable(ws, row, "Stock on Hand",
            ["Code", "Item", "Category", "Unit", "Quantity on Hand", "Reorder At", "Status"],
            items.Select(i => new object[]
            {
                i.ItemCode ?? "—", i.Name, i.Category.Name, i.Unit,
                i.QuantityOnHand, i.ReorderThreshold,
                i.QuantityOnHand <= i.ReorderThreshold ? "LOW STOCK" : "OK",
            }));
        ws.Columns().AdjustToContents();

        // Sheet 2: batches & expiry
        var ws2 = wb.AddWorksheet("Batches & Expiry");
        var today = DateTime.UtcNow.Date;
        var row2 = WriteDocumentHeader(ws2, org, "Active Batches by Expiry", lastCol: 6);
        WriteTable(ws2, row2, "Batches (soonest expiry first)",
            ["Item", "Lot No.", "Remaining Qty", "Received", "Expiration", "Status"],
            batches.Select(b => new object[]
            {
                b.InventoryItem.Name, b.LotNumber ?? "—", b.RemainingQuantity,
                b.ReceivedDate.ToString("yyyy-MM-dd"),
                b.ExpirationDate?.ToString("yyyy-MM-dd") ?? "—",
                b.ExpirationDate is null ? "No expiry"
                    : b.ExpirationDate.Value.Date < today ? "EXPIRED"
                    : (b.ExpirationDate.Value.Date - today).TotalDays <= b.InventoryItem.ExpirationWarningDays ? "Expiring soon"
                    : "OK",
            }));
        ws2.Columns().AdjustToContents();

        return ToBytes(wb);
    }

    // ── workbook building blocks ─────────────────────────────────────────────

    private static int WriteDocumentHeader(IXLWorksheet ws, string org, string title, int lastCol)
    {
        ws.Range(1, 1, 1, lastCol).Merge().Value = org;
        ws.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(14).Font.SetFontColor(XLColor.FromHtml(HeaderGreen));

        ws.Range(2, 1, 2, lastCol).Merge().Value = title;
        ws.Cell(2, 1).Style.Font.SetBold().Font.SetFontSize(11);

        ws.Range(3, 1, 3, lastCol).Merge().Value = $"Generated: {DateTime.Now:yyyy-MM-dd HH:mm} · Inventory & Procurement Management System";
        ws.Cell(3, 1).Style.Font.SetFontSize(9).Font.SetFontColor(XLColor.Gray);

        return 5; // first content row after the letterhead + spacer
    }

    private static int WriteKeyValueBlock(IXLWorksheet ws, int row, string title, IEnumerable<(string Label, object Value)> pairs)
    {
        row = WriteSectionTitle(ws, row, title);
        foreach (var (label, value) in pairs)
        {
            ws.Cell(row, 1).Value = label;
            ws.Cell(row, 1).Style.Font.SetBold();
            ws.Cell(row, 2).Value = XLCellValue.FromObject(value);
            row++;
        }
        return row + 1;
    }

    private static int WriteTable(IXLWorksheet ws, int row, string title, string[] headers, IEnumerable<object[]> rows)
    {
        row = WriteSectionTitle(ws, row, title);

        var headerRow = row;
        for (var c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(row, c + 1);
            cell.Value = headers[c];
            cell.Style
                .Font.SetBold().Font.SetFontColor(XLColor.White)
                .Fill.SetBackgroundColor(XLColor.FromHtml(HeaderGreen));
        }
        row++;

        var any = false;
        foreach (var r in rows)
        {
            any = true;
            for (var c = 0; c < r.Length; c++)
                ws.Cell(row, c + 1).Value = XLCellValue.FromObject(r[c]);
            if (row % 2 == 0)
                ws.Range(row, 1, row, headers.Length).Style.Fill.SetBackgroundColor(XLColor.FromHtml(ZebraGreen));
            row++;
        }

        if (!any)
        {
            ws.Range(row, 1, row, headers.Length).Merge().Value = "No data for the selected filters.";
            ws.Cell(row, 1).Style.Font.SetItalic().Font.SetFontColor(XLColor.Gray);
            row++;
        }

        ws.Range(headerRow, 1, row - 1, headers.Length).Style
            .Border.SetOutsideBorder(XLBorderStyleValues.Thin)
            .Border.SetInsideBorder(XLBorderStyleValues.Hair);

        return row + 1;
    }

    private static int WriteSectionTitle(IXLWorksheet ws, int row, string title)
    {
        ws.Cell(row, 1).Value = title;
        ws.Cell(row, 1).Style.Font.SetBold().Font.SetFontSize(11).Font.SetFontColor(XLColor.FromHtml(HeaderGreen));
        return row + 1;
    }

    private static byte[] ToBytes(XLWorkbook wb)
    {
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
