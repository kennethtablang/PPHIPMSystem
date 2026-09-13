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
    private readonly IDepartmentBudgetService _budgets;

    public ReportExportService(IReportService reports, ISystemSettingsService settings,
        ApplicationDbContext db, IDepartmentBudgetService budgets)
    {
        _reports = reports;
        _settings = settings;
        _db = db;
        _budgets = budgets;
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

    // Appropriation vs. actual commitment per department for one fiscal year —
    // the sheet the annual budget review and COA ask for. Spend comes from the
    // same service the Budgets page uses, so the paper and the screen can't
    // disagree.
    public async Task<byte[]> ExportDepartmentBudgetsAsync(int fiscalYear)
    {
        var org = (await _settings.GetAsync()).OrganizationName;
        var rows = (await _budgets.GetAllAsync(fiscalYear, null)).ToList();
        var budgeted = rows.Where(r => r.HasBudget).ToList();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet($"FY{fiscalYear} Budgets");
        var row = WriteDocumentHeader(ws, org, $"Department Budget Utilisation — FY {fiscalYear}", lastCol: 6);

        row = WriteKeyValueBlock(ws, row, "Summary", new (string, object)[]
        {
            ("Departments with a budget", budgeted.Count),
            ("Total appropriated", budgeted.Sum(r => r.Amount)),
            ("Total committed (purchase orders)", budgeted.Sum(r => r.Committed)),
            ("Total remaining", budgeted.Sum(r => r.Remaining)),
            ("Departments over budget", budgeted.Count(r => r.Remaining < 0)),
        });

        row = WriteTable(ws, row, "By Department",
            ["Department", "Appropriation", "Committed", "Remaining", "Utilisation %", "Purchase Orders"],
            rows.Select(r => new object[]
            {
                r.DepartmentName,
                r.HasBudget ? r.Amount : "Not set",
                r.Committed,
                r.HasBudget ? r.Remaining : "—",
                r.HasBudget ? r.UtilizationPercent : "—",
                r.PurchaseOrderCount,
            }));

        // Estimates, kept well clear of the committed figures above so nobody
        // adds the two together.
        var pending = rows.Where(r => r.Pending > 0).ToList();
        if (pending.Count > 0)
        {
            row = WriteTable(ws, row + 1, "Requests Not Yet on a Purchase Order (estimated)",
                ["Department", "Estimated Value"],
                pending.Select(r => new object[] { r.DepartmentName, r.Pending }));
        }

        ws.Cell(row, 1).Value =
            "Committed = total of purchase orders raised against the department's requests in this fiscal year. " +
            "Estimated values are the requesters' figures and are not commitments.";
        ws.Cell(row, 1).Style.Font.SetItalic().Font.SetFontColor(XLColor.Gray);
        ws.Columns().AdjustToContents();

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

    // Requisition and Issue Slip (patterned on Appendix 63). Quantities issued
    // and stock numbers are left for manual completion where the system has no data.
    public async Task<byte[]?> ExportRequisitionSlipAsync(int requestId)
    {
        var request = await LoadRequestAsync(requestId);
        if (request is null) return null;
        var org = (await _settings.GetAsync()).OrganizationName;

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("RIS");
        var row = WriteDocumentHeader(ws, org, "REQUISITION AND ISSUE SLIP (RIS)", lastCol: 6);

        row = WriteKeyValueBlock(ws, row, "Details", new (string, object)[]
        {
            ("Division / Department", request.Department.Name),
            ("RIS No.", request.RequestNumber),
            ("Date", request.RequestedAt.ToString("yyyy-MM-dd")),
            ("Fund Cluster", "____________"),
        });

        row = WriteTable(ws, row, "Requisition",
            ["Stock No.", "Unit", "Description", "Quantity Requested", "Quantity Issued", "Remarks"],
            request.Items.Select(i => new object[]
            {
                i.InventoryItem.ItemCode ?? "—",
                i.InventoryItem.Unit,
                i.InventoryItem.Name,
                i.QuantityRequested,
                "", // completed by the issuing officer on the printed copy
                i.Remarks ?? "",
            }));

        ws.Cell(row, 1).Value = $"Purpose: {request.Justification}";
        ws.Cell(row, 1).Style.Alignment.SetWrapText();
        row += 2;

        row = WriteSignatureBlock(ws, row, request,
            ["Requested by", "Approved by", "Issued by", "Received by"]);

        ws.Columns().AdjustToContents();
        ws.Column(3).Width = Math.Max(ws.Column(3).Width, 40);
        return ToBytes(wb);
    }

    // Purchase Request (patterned on Appendix 60), with estimated costs.
    public async Task<byte[]?> ExportPurchaseRequestAsync(int requestId)
    {
        var request = await LoadRequestAsync(requestId);
        if (request is null) return null;
        var org = (await _settings.GetAsync()).OrganizationName;

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Purchase Request");
        var row = WriteDocumentHeader(ws, org, "PURCHASE REQUEST (PR)", lastCol: 6);

        row = WriteKeyValueBlock(ws, row, "Details", new (string, object)[]
        {
            ("Office / Section", request.Department.Name),
            ("PR No.", request.RequestNumber),
            ("Date", request.RequestedAt.ToString("yyyy-MM-dd")),
            ("Fund Cluster", "____________"),
        });

        row = WriteTable(ws, row, "Items",
            ["Stock No.", "Unit", "Item Description", "Quantity", "Est. Unit Cost (PHP)", "Est. Total (PHP)"],
            request.Items.Select(i => new object[]
            {
                i.InventoryItem.ItemCode ?? "—",
                i.InventoryItem.Unit,
                i.InventoryItem.Name,
                i.QuantityRequested,
                i.EstimatedUnitCost is decimal c ? c : "—",
                i.EstimatedUnitCost is decimal c2 ? Math.Round(i.QuantityRequested * c2, 2) : "—",
            }));

        var total = request.Items.Where(i => i.EstimatedUnitCost.HasValue)
            .Sum(i => i.QuantityRequested * i.EstimatedUnitCost!.Value);
        ws.Cell(row, 1).Value = $"Estimated total: PHP {total:N2}";
        ws.Cell(row, 1).Style.Font.SetBold();
        row += 2;

        ws.Cell(row, 1).Value = $"Purpose: {request.Justification}";
        ws.Cell(row, 1).Style.Alignment.SetWrapText();
        row += 2;

        row = WriteSignatureBlock(ws, row, request, ["Requested by", "Approved by"]);

        ws.Columns().AdjustToContents();
        ws.Column(3).Width = Math.Max(ws.Column(3).Width, 40);
        return ToBytes(wb);
    }

    private Task<Models.ProcurementRequest?> LoadRequestAsync(int requestId) =>
        _db.ProcurementRequests.AsNoTracking()
            .Include(r => r.Department)
            .Include(r => r.RequestedByUser)
            .Include(r => r.Items).ThenInclude(i => i.InventoryItem)
            .Include(r => r.Approvals).ThenInclude(a => a.ApproverUser)
            .FirstOrDefaultAsync(r => r.Id == requestId);

    // Names the system knows are pre-printed; the rest stay blank for ink.
    private static int WriteSignatureBlock(IXLWorksheet ws, int row, Models.ProcurementRequest request, string[] roles)
    {
        var finalApprover = request.Approvals
            .Where(a => a.Action == Models.Enums.ApprovalAction.Approved)
            .OrderByDescending(a => a.ApprovalLevel)
            .FirstOrDefault();

        foreach (var role in roles)
        {
            var name = role switch
            {
                "Requested by" => $"{request.RequestedByUser.FirstName} {request.RequestedByUser.LastName}",
                "Approved by" when finalApprover is not null =>
                    $"{finalApprover.ApproverUser.FirstName} {finalApprover.ApproverUser.LastName}",
                // The department head signs for the goods on the RIS. Printed
                // when one is on record; otherwise a rule to sign over.
                "Received by" when !string.IsNullOrWhiteSpace(request.Department?.HeadOfDepartment) =>
                    request.Department!.HeadOfDepartment!,
                _ => "_________________________",
            };
            ws.Cell(row, 1).Value = $"{role}:";
            ws.Cell(row, 1).Style.Font.SetBold();
            ws.Cell(row, 2).Value = name;
            ws.Cell(row, 4).Value = "Signature: _______________";
            ws.Cell(row, 5).Value = "Date: _______________";
            row += 2;
        }
        return row;
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
