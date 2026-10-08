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
    private readonly IWebHostEnvironment _env;

    public ReportExportService(IReportService reports, ISystemSettingsService settings,
        ApplicationDbContext db, IWebHostEnvironment env)
    {
        _env = env;
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

        row = WriteTable(ws, row, "Consumption by Category",
            ["Category", "Items Consumed", "Total Quantity", "Share of Total"],
            data.ByCategory.Select(c => new object[] { c.Category, c.UniqueItems, c.TotalQuantity, $"{c.SharePercent:0.##}%" }));

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

        WriteTable(ws, row, "Requests by Status",
            ["Status", "Count"],
            data.ByStatus.Select(kv => new object[] { kv.Key, kv.Value }));

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

    public async Task<byte[]> ExportItemRankingsAsync(ReportFilterDto filter)
    {
        var data = await _reports.GetItemRankingsAsync(filter);
        var org = (await _settings.GetAsync()).OrganizationName;
        var scope = filter.CategoryId.HasValue
            ? data.Categories.FirstOrDefault(c => c.CategoryId == filter.CategoryId)?.Category ?? "Selected Category"
            : "All Categories";

        using var wb = new XLWorkbook();

        // One sheet per ranking: the overall list first, then a ranking inside
        // each category so every category's leaders are visible on their own.
        void WriteSheet(string name, string title, Func<ItemRankingDto, decimal> measure,
            string[] headers, Func<int, ItemRankingDto, object[]> toRow)
        {
            var ws = wb.AddWorksheet(name);
            var row = WriteDocumentHeader(ws, org, $"{title} — {data.Year} · {scope}", lastCol: headers.Length);

            var ranked = data.Items.Where(i => measure(i) > 0)
                .OrderByDescending(measure).ThenBy(i => i.ItemName).ToList();

            row = WriteTable(ws, row, "Overall Ranking", headers, ranked.Select((i, n) => toRow(n + 1, i)));

            foreach (var group in ranked.GroupBy(i => i.Category).OrderByDescending(g => g.Sum(measure)))
                row = WriteTable(ws, row, $"Ranking — {group.Key}", headers,
                    group.Select((i, n) => toRow(n + 1, i)));

            ws.Columns().AdjustToContents();
        }

        WriteSheet("Most Used", "Most Used Items", i => i.QuantityUsed,
            ["Rank", "Item", "Category", "Quantity Used", "Unit"],
            (n, i) => [n, i.ItemName, i.Category, i.QuantityUsed, i.Unit]);

        WriteSheet("Most Procured", "Most Procured Items", i => i.QuantityProcured,
            ["Rank", "Item", "Category", "Quantity Procured", "Unit", "No. of POs", "Amount (PHP)"],
            (n, i) => [n, i.ItemName, i.Category, i.QuantityProcured, i.Unit, i.PurchaseOrderCount, i.ProcuredAmount]);

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
        var row2 = WriteDocumentHeader(ws2, org, "Active Batches by Expiry", lastCol: 8);
        WriteTable(ws2, row2, "Batches (soonest expiry first)",
            ["Item", "Lot No.", "Remaining Qty", "Unit Cost", "Line Value", "Received", "Expiration", "Status"],
            batches.Select(b => new object[]
            {
                b.InventoryItem.Name, b.LotNumber ?? "—", b.RemainingQuantity,
                b.UnitCost is decimal uc ? uc : "—",
                b.UnitCost is decimal c ? b.RemainingQuantity * c : "—",
                b.ReceivedDate.ToString("yyyy-MM-dd"),
                b.ExpirationDate?.ToString("yyyy-MM-dd") ?? "—",
                b.ExpirationDate is null ? "No expiry"
                    : b.ExpirationDate.Value.Date < today ? "EXPIRED"
                    : (b.ExpirationDate.Value.Date - today).TotalDays <= b.InventoryItem.ExpirationWarningDays ? "Expiring soon"
                    : "OK",
            }));
        ws2.Columns().AdjustToContents();

        // Sheet 3: valuation — weighted-average cost over costed batches only.
        var ws3 = wb.AddWorksheet("Valuation");
        var row3 = WriteDocumentHeader(ws3, org, "Stock Valuation (weighted average of costed batches)", lastCol: 6);
        var valuation = batches
            .Where(b => b.UnitCost is not null)
            .GroupBy(b => b.InventoryItem)
            .Select(g =>
            {
                var costedQty = g.Sum(b => b.RemainingQuantity);
                var value = g.Sum(b => b.RemainingQuantity * b.UnitCost!.Value);
                return new
                {
                    Item = g.Key,
                    CostedQty = costedQty,
                    AvgCost = costedQty > 0 ? Math.Round(value / costedQty, 2) : 0,
                    Value = Math.Round(value, 2),
                };
            })
            .OrderByDescending(v => v.Value)
            .ToList();

        row3 = WriteTable(ws3, row3, "Value by Item",
            ["Item", "Unit", "On Hand", "Costed Qty", "Avg Unit Cost (PHP)", "Stock Value (PHP)"],
            valuation.Select(v => new object[]
            {
                v.Item.Name, v.Item.Unit, v.Item.QuantityOnHand, v.CostedQty, v.AvgCost, v.Value,
            }));

        ws3.Cell(row3, 1).Value = $"Total stock value (costed batches): PHP {valuation.Sum(v => v.Value):N2}";
        ws3.Cell(row3, 1).Style.Font.SetBold().Font.SetFontColor(XLColor.FromHtml(HeaderGreen));
        row3 += 2;
        ws3.Cell(row3, 1).Value = "Stock received without a cost (manual receipts before costing, pre-batch stock) is not included.";
        ws3.Cell(row3, 1).Style.Font.SetItalic().Font.SetFontColor(XLColor.Gray);
        ws3.Columns().AdjustToContents();

        // Sheet 4: department stock — what wards hold that has not been returned
        // or consumed. This is stock the hospital still owns but that has already
        // left the storeroom, so it is NOT part of the Stock on Hand figures above.
        var deptStock = await _db.DepartmentStocks.AsNoTracking()
            .Include(d => d.Department)
            .Include(d => d.InventoryItem)
            .Where(d => d.Quantity > 0)
            .OrderBy(d => d.Department.Name).ThenBy(d => d.InventoryItem.Name)
            .ToListAsync();

        var ws4 = wb.AddWorksheet("Department Stock");
        var row4 = WriteDocumentHeader(ws4, org, "Stock Held by Departments", lastCol: 5);
        row4 = WriteTable(ws4, row4, "Held by Ward / Unit",
            ["Department", "Item", "Code", "Unit", "Quantity Held"],
            deptStock.Select(d => new object[]
            {
                d.Department.Name, d.InventoryItem.Name,
                d.InventoryItem.ItemCode ?? "—", d.InventoryItem.Unit, d.Quantity,
            }));

        if (deptStock.Count > 0)
        {
            row4 = WriteTable(ws4, row4 + 1, "Total Held per Department",
                ["Department", "Distinct Items", "Total Units"],
                deptStock.GroupBy(d => d.Department.Name)
                    .OrderBy(g => g.Key)
                    .Select(g => new object[] { g.Key, g.Count(), g.Sum(d => d.Quantity) }));
        }

        ws4.Cell(row4, 1).Value =
            "Department stock has already been deducted from Stock on Hand — the two sheets do not overlap.";
        ws4.Cell(row4, 1).Style.Font.SetItalic().Font.SetFontColor(XLColor.Gray);
        ws4.Columns().AdjustToContents();

        return ToBytes(wb);
    }

    public async Task<byte[]> ExportDisposalCertificateAsync(DateTime startDate, DateTime endDate)
    {
        var org = (await _settings.GetAsync()).OrganizationName;
        var endExclusive = endDate.Date.AddDays(1);

        var disposals = await _db.StockMovements.AsNoTracking()
            .Include(m => m.InventoryItem)
            .Include(m => m.PerformedByUser)
            .Where(m => m.MovementType == Models.Enums.StockMovementType.Disposal
                        && m.MovementDate >= startDate.Date && m.MovementDate < endExclusive)
            .OrderBy(m => m.MovementDate)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Disposal Certificate");
        var row = WriteDocumentHeader(ws, org,
            $"Certificate of Disposal / Write-Off — {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}", lastCol: 6);

        row = WriteTable(ws, row, "Disposed Stock",
            ["Date", "Item", "Quantity", "Unit", "Details", "Disposed By"],
            disposals.Select(d => new object[]
            {
                d.MovementDate.ToString("yyyy-MM-dd HH:mm"),
                d.InventoryItem.Name,
                d.Quantity,
                d.InventoryItem.Unit,
                d.Remarks ?? "—",
                d.PerformedByUser is null ? "—" : $"{d.PerformedByUser.FirstName} {d.PerformedByUser.LastName}",
            }));

        ws.Cell(row, 1).Value = $"Total entries: {disposals.Count} · Total quantity: {disposals.Sum(d => d.Quantity):N2}";
        ws.Cell(row, 1).Style.Font.SetBold();
        row += 3;

        // Signature block for the physical filing copy.
        foreach (var role in new[] { "Prepared by", "Noted by", "Witnessed by" })
        {
            ws.Cell(row, 1).Value = $"{role}: _________________________";
            ws.Cell(row, 4).Value = "Date: _______________";
            row += 2;
        }

        ws.Columns().AdjustToContents();
        return ToBytes(wb);
    }

    // ── LGU forms ────────────────────────────────────────────────────────────

    // Requisition and Issue Slip on the hospital's controlled form
    // FRM-ADM-SUP-011: letterhead with both seals, 25 ruled lines per page
    // split into the Requisition side (what the ward asked for) and the
    // Issuance side (what the storeroom gave), then the signatories and the
    // document-control strip. Every page is a complete slip.
    //
    // Eight columns: A Qty | B Unit | C:E Articles/Description |
    // F Issued Qty | G:H Remarks. The header and signature rows reuse the same
    // grid with different merges.
    private const int RisLinesPerPage = 25;
    private const string RisFont = "Arial";

    public async Task<byte[]?> ExportRequisitionSlipAsync(int requestId)
    {
        var request = await LoadRequestAsync(requestId);
        if (request is null) return null;
        var s = await _settings.GetAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("RIS");
        ws.Style.Font.SetFontName(RisFont).Font.SetFontSize(10);

        double[] widths = [10, 10, 16, 16, 16, 13, 9, 15];
        for (var c = 0; c < widths.Length; c++) ws.Column(c + 1).Width = widths[c];

        var lines = request.Items.OrderBy(i => i.InventoryItem.Name).ToList();
        var pages = Math.Max(1, (int)Math.Ceiling(lines.Count / (double)RisLinesPerPage));
        var seals = LoadFormSeals();

        var row = 1;
        for (var page = 0; page < pages; page++)
        {
            var pageLines = lines.Skip(page * RisLinesPerPage).Take(RisLinesPerPage).ToList();
            row = WriteRequisitionSlipPage(ws, row, request, s, seals, pageLines, page + 1, pages);
            if (page < pages - 1) ws.PageSetup.AddHorizontalPageBreak(row - 1);
        }

        var setup = ws.PageSetup;
        setup.PaperSize = XLPaperSize.LetterPaper; // short bond, like the printed pad
        setup.PageOrientation = XLPageOrientation.Portrait;
        setup.Margins.SetTop(0.4).SetBottom(0.4).SetLeft(0.4).SetRight(0.4).SetHeader(0).SetFooter(0);
        setup.CenterHorizontally = true;
        setup.FitToPages(1, 0);
        setup.PrintAreas.Add(1, 1, row - 1, widths.Length);
        ws.ShowGridLines = false;

        return ToBytes(wb);
    }

    private static int WriteRequisitionSlipPage(IXLWorksheet ws, int top, Models.ProcurementRequest request,
        DTOs.System.SystemSettingsDto s, (byte[]? Left, byte[]? Right) seals,
        List<Models.ProcurementRequestItem> pageLines, int pageNo, int pageCount)
    {
        const int last = 8;
        var row = top;

        IXLRange Text(int r, int c1, int c2, string text, double size = 10, bool bold = true,
            XLAlignmentHorizontalValues align = XLAlignmentHorizontalValues.Left)
        {
            var range = c1 == c2 ? ws.Range(r, c1, r, c2) : ws.Range(r, c1, r, c2).Merge();
            range.Value = text;
            range.Style.Font.SetFontSize(size).Font.SetBold(bold)
                .Alignment.SetHorizontal(align).Alignment.SetVertical(XLAlignmentVerticalValues.Bottom);
            return range;
        }
        // A value written on a signing/fill-in line.
        IXLRange Line(int r, int c1, int c2, string? value, bool bold = true)
        {
            var range = Text(r, c1, c2, value ?? "", bold: bold, align: XLAlignmentHorizontalValues.Center);
            range.Style.Alignment.SetShrinkToFit().Border.SetBottomBorder(XLBorderStyleValues.Thin);
            return range;
        }
        void Caption(int r, int c1, int c2, string text) =>
            Text(r, c1, c2, text, size: 10, bold: true, align: XLAlignmentHorizontalValues.Center)
                .Style.Font.SetItalic().Alignment.SetVertical(XLAlignmentVerticalValues.Top);

        // ── Letterhead: seals either side of the hospital name.
        var headTop = row;
        Text(row, 2, 7, s.OrganizationName, size: 18, align: XLAlignmentHorizontalValues.Center)
            .Style.Border.SetBottomBorder(XLBorderStyleValues.Medium);
        ws.Row(row).Height = 28;
        row++;
        Text(row, 2, 7, s.LetterheadAddress, size: 10, align: XLAlignmentHorizontalValues.Center);
        row++;
        Text(row, 2, 7, s.LetterheadCertification, size: 10, align: XLAlignmentHorizontalValues.Center);
        row++;
        ws.Row(row).Height = 8;
        row++;
        AddSeal(ws, seals.Left, headTop, 1, "SealLeft" + top);
        AddSeal(ws, seals.Right, headTop, last, "SealRight" + top);

        // Urgent requests are flagged on the printed slip so the storeroom
        // prioritises the paper copy as well.
        var risTitle = Text(row, 1, last, request.IsUrgent ? "REQUISITION AND ISSUE SLIP — URGENT" : "REQUISITION AND ISSUE SLIP",
            size: 14, align: XLAlignmentHorizontalValues.Center);
        if (request.IsUrgent) risTitle.Style.Font.SetFontColor(XLColor.Red);
        ws.Row(row).Height = 26;
        row++;

        Text(row, 1, 2, "Department / Office :", bold: false);
        Line(row, 3, 4, request.Department.Name);
        Text(row, 5, 5, "Date :", bold: false, align: XLAlignmentHorizontalValues.Right);
        Line(row, 6, 6, request.RequestedAt.ToLocalTime().ToString("MM-dd-yyyy"));
        Text(row, 7, 7, "RIS No.", bold: false, align: XLAlignmentHorizontalValues.Right);
        Line(row, 8, 8, request.RequestNumber);
        ws.Row(row).Height = 18;
        row++;

        // ── Table header: Qty and Unit span both header rows; REQUISITION
        // heads the description, ISSUANCE heads quantity + remarks.
        var tableTop = row;
        ws.Range(row, 1, row + 1, 1).Merge().Value = "Qty.";
        ws.Range(row, 2, row + 1, 2).Merge().Value = "Unit";
        ws.Range(row, 3, row, 5).Merge().Value = "REQUISITION";
        ws.Range(row, 6, row, last).Merge().Value = "ISSUANCE";
        ws.Range(row + 1, 3, row + 1, 5).Merge().Value = "Articles/Description";
        ws.Cell(row + 1, 6).Value = "Quantity";
        ws.Range(row + 1, 7, row + 1, last).Merge().Value = "Remarks";
        var head = ws.Range(row, 1, row + 1, last);
        head.Style.Font.SetFontSize(11).Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center)
            .Alignment.SetVertical(XLAlignmentVerticalValues.Center);
        ws.Range(row, 3, row, last).Style.Font.SetBold().Font.SetItalic();
        ws.Row(row).Height = 17;
        ws.Row(row + 1).Height = 17;
        row += 2;

        var released = request.Status == Models.Enums.ProcurementStatus.Released;
        for (var i = 0; i < RisLinesPerPage; i++)
        {
            ws.Range(row, 3, row, 5).Merge();
            ws.Range(row, 7, row, last).Merge();
            if (i < pageLines.Count)
            {
                var line = pageLines[i];
                ws.Cell(row, 1).Value = line.QuantityRequested;
                ws.Cell(row, 1).Style.NumberFormat.SetFormat(WholeOrDecimal(line.QuantityRequested));
                ws.Cell(row, 2).Value = line.InventoryItem.Unit;
                ws.Cell(row, 3).Value = string.IsNullOrWhiteSpace(line.InventoryItem.Brand)
                    ? line.InventoryItem.Name
                    : $"{line.InventoryItem.Name} ({line.InventoryItem.Brand})";
                // Issued quantities are known once the system has released the
                // request; before that the column is left for the storeroom's ink.
                if (released && line.QuantityReleased is decimal issued)
                {
                    ws.Cell(row, 6).Value = issued;
                    ws.Cell(row, 6).Style.NumberFormat.SetFormat(WholeOrDecimal(issued));
                }
                ws.Cell(row, 7).Value = string.Join("; ", new[]
                {
                    line.QuantityApproved is decimal a && a < line.QuantityRequested ? $"Allocated {a:0.##} (limited stock)" : null,
                    line.Remarks,
                }.Where(x => !string.IsNullOrWhiteSpace(x)));
            }
            ws.Row(row).Height = 20;
            row++;
        }
        var body = ws.Range(tableTop + 2, 1, row - 1, last);
        body.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Bottom).Alignment.SetShrinkToFit();
        ws.Range(tableTop + 2, 1, row - 1, 2).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Range(tableTop + 2, 6, row - 1, 6).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Range(tableTop, 1, row - 1, last).Style.Border.SetInsideBorder(XLBorderStyleValues.Thin)
            .Border.SetOutsideBorder(XLBorderStyleValues.Medium);
        // The heavier rule between the requisition and issuance halves.
        ws.Range(tableTop, 6, row - 1, 6).Style.Border.SetLeftBorder(XLBorderStyleValues.Medium);
        row++;

        // ── Signatories.
        // Requested by is the person who typed their name on the request (on
        // a shared ward PC the account is the ward's, not theirs); Noted by
        // is the department's section head.
        var requester = request.RequestedByName
                        ?? $"{request.RequestedByUser.FirstName} {request.RequestedByUser.LastName}";
        Text(row, 1, 2, "Requested by:");
        Line(row, 3, 4, requester.ToUpperInvariant());
        Text(row, 5, 5, "Noted by:", align: XLAlignmentHorizontalValues.Right);
        Line(row, 6, last, request.Department.HeadOfDepartment?.ToUpperInvariant());
        ws.Row(row).Height = 24;
        row++;
        Caption(row, 3, 4, "(End User)");
        Caption(row, 6, last, "(Section Head)");
        row += 2;

        Text(row, 1, 2, "Approved by:");
        row++;
        ws.Row(row).Height = 24;
        Line(row, 3, 5, s.RisApprover1Name.ToUpperInvariant());
        Line(row, 6, last, s.RisApprover2Name.ToUpperInvariant());
        row++;
        Caption(row, 3, 5, s.RisApprover1Designation);
        Caption(row, 6, last, s.RisApprover2Designation);
        row += 2;

        // Issued by: whoever released the stock — the Inventory Officer who
        // allocated it — once the system has done the release.
        var issuer = released
            ? request.Approvals
                .Where(a => a.Action == Models.Enums.ApprovalAction.Approved && a.ApproverRole == Models.Enums.UserRole.InventoryOfficer)
                .OrderByDescending(a => a.ApprovalLevel)
                .Select(a => $"{a.ApproverUser.FirstName} {a.ApproverUser.LastName}")
                .FirstOrDefault()
            : null;
        Text(row, 1, 2, "Issued by:");
        Line(row, 3, 4, issuer?.ToUpperInvariant());
        Text(row, 5, 5, "Received by:", align: XLAlignmentHorizontalValues.Right);
        Line(row, 6, last, null);
        ws.Row(row).Height = 24;
        row += 2;

        // ── Document control strip.
        Text(row, 1, 2, s.RisFormCode, bold: false, align: XLAlignmentHorizontalValues.Center);
        Text(row, 3, 4, $"Revision No. {s.RisRevisionNo}", bold: false, align: XLAlignmentHorizontalValues.Center);
        Text(row, 5, 5, s.RisRevisionDate, bold: false, align: XLAlignmentHorizontalValues.Center);
        Text(row, 6, last, $"Page {pageNo} of {pageCount}", bold: false, align: XLAlignmentHorizontalValues.Center);
        var strip = ws.Range(row, 1, row, last);
        strip.Style.Font.SetFontSize(11).Alignment.SetVertical(XLAlignmentVerticalValues.Center)
            .Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetInsideBorder(XLBorderStyleValues.Thin);
        ws.Row(row).Height = 20;
        row++;
        ws.Row(row).Height = 10; // breathing room before the next page's letterhead
        row++;

        return row;
    }

    private static string WholeOrDecimal(decimal value) =>
        value == decimal.Truncate(value) ? "#,##0" : "#,##0.##";

    // The province and hospital seals for printed forms. Drop clean PNGs at
    // Assets/Forms/province-seal.png and Assets/Forms/hospital-seal.png in the
    // server's content root; without them the letterhead prints text only.
    private (byte[]? Left, byte[]? Right) LoadFormSeals()
    {
        byte[]? Read(string name)
        {
            var path = Path.Combine(_env.ContentRootPath, "Assets", "Forms", name);
            return File.Exists(path) ? File.ReadAllBytes(path) : null;
        }
        return (Read("province-seal.png"), Read("hospital-seal.png"));
    }

    private static void AddSeal(IXLWorksheet ws, byte[]? png, int row, int col, string name)
    {
        if (png is null) return;
        using var ms = new MemoryStream(png);
        var pic = ws.AddPicture(ms, name).MoveTo(ws.Cell(row, col));
        // Scale to ~60pt tall: the three letterhead rows.
        var scale = 80.0 / pic.OriginalHeight;
        pic.WithSize((int)(pic.OriginalWidth * scale), (int)(pic.OriginalHeight * scale));
    }

    // Purchase Request on the Provincial Government's Appendix 47 form, laid
    // out to print like the paper original: 30 item lines per page on long
    // bond (8.5" x 13"), every page a complete form with its own header,
    // purpose and signatory block so each sheet can be signed and filed.
    //
    // Columns: A Item No. | B Unit | C:D Item Description | E Quantity |
    // F Unit Cost | G Total Cost. The description is split over C and D only
    // so the three signatory boxes below can be of equal width (B-label is
    // A:B, then C, D:E and F:G).
    private const int PrLinesPerPage = 30;
    private const string FormFont = "Times New Roman";
    private const string EntryFont = "Calibri";

    public async Task<byte[]?> ExportPurchaseRequestAsync(int requestId)
    {
        var request = await LoadRequestAsync(requestId);
        if (request is null) return null;
        var s = await _settings.GetAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Purchase Request");
        ws.Style.Font.SetFontName(EntryFont).Font.SetFontSize(10);

        double[] widths = [7, 9, 30, 20, 10, 11, 17];
        for (var c = 0; c < widths.Length; c++) ws.Column(c + 1).Width = widths[c];

        var lines = request.Items.ToList();
        var printRows = PurchaseRequestRows(lines);
        var pages = Math.Max(1, (int)Math.Ceiling(printRows.Count / (double)PrLinesPerPage));
        var hasCosts = lines.Any(i => i.EstimatedUnitCost.HasValue);

        var row = 1;
        for (var page = 0; page < pages; page++)
        {
            var pageRows = printRows.Skip(page * PrLinesPerPage).Take(PrLinesPerPage).ToList();
            var isLast = page == pages - 1;
            row = WritePurchaseRequestPage(ws, row, request, s, pageRows,
                grandTotal: isLast && hasCosts
                    ? lines.Where(i => i.EstimatedUnitCost.HasValue).Sum(i => i.QuantityRequested * i.EstimatedUnitCost!.Value)
                    : null,
                pageNo: page + 1, pageCount: pages);
            if (!isLast) ws.PageSetup.AddHorizontalPageBreak(row - 1);
        }

        var setup = ws.PageSetup;
        // Long bond is what the office uses, but row heights are chosen so a
        // form still fits on one Letter page when the printer lacks 8.5" x 13".
        setup.PaperSize = XLPaperSize.FolioPaper; // 8.5" x 13" long bond
        setup.PageOrientation = XLPageOrientation.Portrait;
        setup.Margins.SetTop(0.4).SetBottom(0.4).SetLeft(0.4).SetRight(0.4).SetHeader(0).SetFooter(0);
        setup.CenterHorizontally = true;
        setup.FitToPages(1, 0); // fit the width; page breaks above set the height
        setup.PrintAreas.Add(1, 1, row - 1, widths.Length);
        ws.ShowGridLines = false;

        return ToBytes(wb);
    }

    // One ruled line of the PR item table: a category heading or an item.
    private record PrRow(string? Heading, Models.ProcurementRequestItem? Line, int ItemNo);

    // Items grouped by category (both alphabetical), numbered straight through
    // — the same order the PR form on screen shows (utils/purchaseRequest.js).
    // A PR covering a single category, like most paper PRs, gets no heading.
    private static List<PrRow> PurchaseRequestRows(List<Models.ProcurementRequestItem> lines)
    {
        var groups = lines
            .GroupBy(i => (i.InventoryItem.Category?.Name ?? "Uncategorized").Trim(), StringComparer.OrdinalIgnoreCase)
            .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var rows = new List<PrRow>();
        var no = 0;
        foreach (var g in groups)
        {
            if (groups.Count > 1) rows.Add(new PrRow(g.Key.ToUpperInvariant(), null, 0));
            foreach (var line in g.OrderBy(i => i.InventoryItem.Name, StringComparer.OrdinalIgnoreCase))
                rows.Add(new PrRow(null, line, ++no));
        }
        return rows;
    }

    private static int WritePurchaseRequestPage(IXLWorksheet ws, int top, Models.ProcurementRequest request,
        DTOs.System.SystemSettingsDto s, List<PrRow> pageRows,
        decimal? grandTotal, int pageNo, int pageCount)
    {
        const int last = 7;
        var row = top;

        void Label(int r, int c1, int c2, string text, XLAlignmentHorizontalValues align = XLAlignmentHorizontalValues.Left)
        {
            var range = ws.Range(r, c1, r, c2).Merge();
            range.Value = text;
            range.Style.Font.SetFontName(FormFont).Font.SetBold().Font.SetFontSize(11)
                .Alignment.SetHorizontal(align).Alignment.SetVertical(XLAlignmentVerticalValues.Bottom);
        }
        // A filled-in value sits on an underline, like the blanks on the paper form.
        void Blank(int r, int c1, int c2, string? value)
        {
            var range = ws.Range(r, c1, r, c2).Merge();
            range.Value = value ?? "";
            range.Style.Font.SetBold()
                .Alignment.SetVertical(XLAlignmentVerticalValues.Bottom)
                .Border.SetBottomBorder(XLBorderStyleValues.Thin);
        }

        // "Appendix 47" sits above the box, right-aligned and italic.
        var appendix = ws.Range(row, 1, row, last).Merge();
        appendix.Value = "Appendix 47";
        appendix.Style.Font.SetFontName(FormFont).Font.SetItalic().Font.SetBold().Font.SetFontSize(10)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Right);
        row++;

        var boxTop = row;
        var title = ws.Range(row, 1, row, last).Merge();
        title.Value = "PURCHASE REQUEST";
        title.Style.Font.SetFontName(FormFont).Font.SetBold().Font.SetFontSize(15)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Row(row).Height = 24;
        row++;

        Label(row, 1, 1, "LGU:");
        Blank(row, 2, 4, s.PrLgu.ToUpperInvariant());
        Label(row, 5, 5, "Fund:", XLAlignmentHorizontalValues.Right);
        Blank(row, 6, 7, request.Fund);
        ws.Row(row).Height = 20;
        ws.Range(row, 1, row, last).Style.Border.SetBottomBorder(XLBorderStyleValues.Medium);
        row++;

        Label(row, 1, 2, "Department:");
        Blank(row, 3, 3, s.PrDepartment);
        Label(row, 4, 4, "PR No.:", XLAlignmentHorizontalValues.Right);
        Blank(row, 5, 5, null);
        Label(row, 6, 6, "Date:", XLAlignmentHorizontalValues.Right);
        Blank(row, 7, 7, null);
        ws.Row(row).Height = 20;
        row++;

        Label(row, 1, 2, "Section:");
        Blank(row, 3, 3, request.Section);
        Label(row, 4, 4, "FPP:", XLAlignmentHorizontalValues.Right);
        Blank(row, 5, 5, request.Fpp);
        ws.Row(row).Height = 20;
        // The date line spans the two rows on the paper form; keep the right
        // column visually one block.
        ws.Range(row - 1, 6, row, last).Style.Border.SetLeftBorder(XLBorderStyleValues.Thin);
        row++;
        ws.Range(boxTop, 1, row - 1, last).Style.Border.SetOutsideBorder(XLBorderStyleValues.Medium);

        // Item table header.
        var headerRow = row;
        string[] headers = ["Item\nNo.", "Unit", "Item Description", "", "Quan-\ntity", "Unit\nCost", "Total Cost"];
        for (var c = 0; c < headers.Length; c++)
        {
            if (c == 3) continue;
            ws.Cell(row, c + 1).Value = headers[c];
        }
        ws.Range(row, 3, row, 4).Merge();
        var hdr = ws.Range(row, 1, row, last);
        hdr.Style.Font.SetFontName(FormFont).Font.SetBold().Font.SetFontSize(11)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center)
            .Alignment.SetVertical(XLAlignmentVerticalValues.Center)
            .Alignment.SetWrapText();
        ws.Row(row).Height = 30;
        row++;

        // Always 30 ruled lines, filled from the top, so every page looks
        // like the printed form even when the PR is short.
        for (var i = 0; i < PrLinesPerPage; i++)
        {
            ws.Range(row, 3, row, 4).Merge();
            if (i < pageRows.Count && pageRows[i].Heading is string heading)
            {
                ws.Cell(row, 3).Value = heading;
                ws.Cell(row, 3).Style.Font.SetBold().Font.SetUnderline();
            }
            else if (i < pageRows.Count && pageRows[i].Line is { } line)
            {
                ws.Cell(row, 1).Value = pageRows[i].ItemNo;
                ws.Cell(row, 2).Value = FormUnit(line.InventoryItem.Unit);
                // No brand on a PR: government procurement specifies the
                // item, never the make.
                ws.Cell(row, 3).Value = line.InventoryItem.Name.ToUpperInvariant();
                ws.Cell(row, 5).Value = line.QuantityRequested;
                // Whole quantities print without a decimal point ("10", not "10.").
                ws.Cell(row, 5).Style.NumberFormat.SetFormat(
                    line.QuantityRequested == decimal.Truncate(line.QuantityRequested) ? "#,##0" : "#,##0.##");
                if (line.EstimatedUnitCost is decimal cost)
                {
                    ws.Cell(row, 6).Value = cost;
                    ws.Cell(row, 7).Value = Math.Round(line.QuantityRequested * cost, 2);
                }
            }
            ws.Row(row).Height = 18;
            row++;
        }
        var body = ws.Range(headerRow + 1, 1, row - 1, last);
        body.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Bottom).Alignment.SetShrinkToFit();
        ws.Range(headerRow + 1, 1, row - 1, 1).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Range(headerRow + 1, 5, row - 1, 5).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Range(headerRow + 1, 6, row - 1, last).Style.NumberFormat.SetFormat("#,##0.00");

        if (grandTotal is decimal total)
        {
            ws.Range(row, 1, row, 6).Merge().Value = "TOTAL";
            ws.Cell(row, 1).Style.Font.SetBold().Alignment.SetHorizontal(XLAlignmentHorizontalValues.Right);
            ws.Cell(row, 7).Value = total;
            ws.Cell(row, 7).Style.Font.SetBold().NumberFormat.SetFormat("#,##0.00");
            ws.Row(row).Height = 17;
            row++;
        }
        var table = ws.Range(headerRow, 1, row - 1, last);
        table.Style.Border.SetInsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorder(XLBorderStyleValues.Medium);

        // Purpose: label on the left, the text on ruled lines to the right.
        var purposeTop = row;
        Label(row, 1, 2, "Purpose:");
        ws.Cell(row, 1).Style.Alignment.SetVertical(XLAlignmentVerticalValues.Top);
        var purpose = ws.Range(row, 3, row + 2, last).Merge();
        purpose.Value = (request.IsUrgent ? $"URGENT — {request.UrgentReason?.ToUpperInvariant()}. " : "") + request.Justification.ToUpperInvariant();
        purpose.Style.Font.SetBold().Alignment.SetWrapText()
            .Alignment.SetVertical(XLAlignmentVerticalValues.Top);
        for (var r = row; r <= row + 2; r++) ws.Row(r).Height = 16;
        ws.Range(row, 1, row + 2, 2).Merge();
        row += 3;
        ws.Range(purposeTop, 1, row - 1, last).Style.Border.SetOutsideBorder(XLBorderStyleValues.Medium);

        // Signatories: three equal boxes beside a label column.
        var sigTop = row;
        (int From, int To, string Heading, string Name, string Designation)[] boxes =
        [
            (3, 3, "Requested by:", s.PrRequestedByName, s.PrRequestedByDesignation),
            (4, 5, "Cash Availability:", s.PrCashAvailabilityName, s.PrCashAvailabilityDesignation),
            (6, 7, "For & By\nAuthority of the Governor:", s.PrApproverName, s.PrApproverDesignation),
        ];
        foreach (var b in boxes)
        {
            var heading = ws.Range(row, b.From, row, b.To).Merge();
            heading.Value = b.Heading;
            heading.Style.Font.SetFontName(FormFont).Font.SetBold().Font.SetFontSize(11)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center)
                .Alignment.SetVertical(XLAlignmentVerticalValues.Top).Alignment.SetWrapText();
        }
        ws.Row(row).Height = 32;
        row++;
        ws.Row(row).Height = 22; // room to sign
        string[] rowLabels = ["Signature:", "Printed Name:", "Designation:"];
        for (var k = 0; k < rowLabels.Length; k++)
        {
            Label(row, 1, 2, rowLabels[k]);
            foreach (var b in boxes)
            {
                var cell = ws.Range(row, b.From, row, b.To).Merge();
                cell.Value = k switch { 1 => b.Name.ToUpperInvariant(), 2 => b.Designation, _ => "" };
                cell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center)
                    .Alignment.SetVertical(XLAlignmentVerticalValues.Bottom)
                    .Alignment.SetShrinkToFit()
                    .Font.SetBold(k == 1)
                    .Border.SetBottomBorder(XLBorderStyleValues.Thin);
            }
            if (k > 0) ws.Row(row).Height = 18;
            row++;
        }
        ws.Range(sigTop, 1, row - 1, last).Style.Border.SetOutsideBorder(XLBorderStyleValues.Medium);
        foreach (var b in boxes)
            ws.Range(sigTop, b.From, row - 1, b.To).Style.Border.SetLeftBorder(XLBorderStyleValues.Thin);

        // Control reference under the box, where the office writes theirs.
        var reference = ws.Range(row, 1, row, last).Merge();
        reference.Value = $"{request.RequestedAt.ToLocalTime():M/d/yyyy} · {request.RequestNumber}" +
                          (pageCount > 1 ? $" · Page {pageNo} of {pageCount}" : "");
        reference.Style.Font.SetFontSize(9).Font.SetBold()
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left).Alignment.SetIndent(3);
        row++;

        return row;
    }

    // Units print the way the supply office writes them: upper case, with
    // the plural PCS for pieces.
    private static string FormUnit(string unit) =>
        unit.Trim().ToLowerInvariant() switch
        {
            "pc" => "PCS",
            "ream" => "REAMS",
            "kg" => "KGS",
            "bottle" => "BOT",
            "gallon" => "GAL",
            var u => u.ToUpperInvariant(),
        };

    private Task<Models.ProcurementRequest?> LoadRequestAsync(int requestId) =>
        _db.ProcurementRequests.AsNoTracking()
            .Include(r => r.Department)
            .Include(r => r.RequestedByUser)
            .Include(r => r.Items).ThenInclude(i => i.InventoryItem).ThenInclude(ii => ii.Category)
            .Include(r => r.Approvals).ThenInclude(a => a.ApproverUser)
            .FirstOrDefaultAsync(r => r.Id == requestId);

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
