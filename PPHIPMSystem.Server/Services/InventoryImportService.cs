using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Inventory;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

// Bulk inventory-item onboarding from a spreadsheet. Preview validates every
// row without writing; Import creates the valid rows and reports the rest.
public class InventoryImportService : IInventoryImportService
{
    private const int MaxRows = 1000;

    private readonly ApplicationDbContext _db;
    private readonly ISystemSettingsService _settings;
    private readonly IAuditLogService _audit;

    public InventoryImportService(ApplicationDbContext db, ISystemSettingsService settings, IAuditLogService audit)
    {
        _db = db;
        _settings = settings;
        _audit = audit;
    }

    public byte[] BuildTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Items");

        string[] headers = ["Name", "Item Code", "Description", "Unit", "Category", "Reorder Threshold", "Expiration Warning Days"];
        for (var c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style.Font.SetBold().Font.SetFontColor(XLColor.White)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1A6A36"));
        }

        // Example row to make the expected shape obvious; delete before importing.
        ws.Cell(2, 1).Value = "Paracetamol 500mg Tablet";
        ws.Cell(2, 2).Value = "MED-0001";
        ws.Cell(2, 3).Value = "Analgesic / antipyretic";
        ws.Cell(2, 4).Value = "box";
        ws.Cell(2, 5).Value = "Medicines";
        ws.Cell(2, 6).Value = 20;
        ws.Cell(2, 7).Value = 60;

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public Task<ImportResultDto> PreviewAsync(Stream xlsx) => ProcessAsync(xlsx, userId: null);

    public Task<ImportResultDto> ImportAsync(Stream xlsx, string userId) => ProcessAsync(xlsx, userId);

    // userId == null → validate only; otherwise persist the valid rows.
    private async Task<ImportResultDto> ProcessAsync(Stream xlsx, string? userId)
    {
        var rows = ParseRows(xlsx);

        var categories = await _db.Categories.AsNoTracking()
            .ToDictionaryAsync(c => c.Name.Trim().ToLowerInvariant(), c => c.Id);
        var existingNames = (await _db.InventoryItems.AsNoTracking().Select(i => i.Name).ToListAsync())
            .Select(n => n.Trim().ToLowerInvariant()).ToHashSet();
        var existingCodes = (await _db.InventoryItems.AsNoTracking()
                .Where(i => i.ItemCode != null).Select(i => i.ItemCode!).ToListAsync())
            .Select(c => c.Trim().ToLowerInvariant()).ToHashSet();
        var defaults = await _settings.GetAsync();

        var seenNames = new HashSet<string>();
        var seenCodes = new HashSet<string>();

        foreach (var row in rows)
        {
            var name = row.Name?.Trim() ?? "";
            var code = row.ItemCode?.Trim();
            var unit = row.Unit?.Trim() ?? "";
            var category = row.Category?.Trim() ?? "";

            if (name.Length == 0) row.Errors.Add("Name is required.");
            else if (name.Length > 200) row.Errors.Add("Name exceeds 200 characters.");
            else if (existingNames.Contains(name.ToLowerInvariant())) row.Errors.Add("An item with this name already exists.");
            else if (!seenNames.Add(name.ToLowerInvariant())) row.Errors.Add("Duplicate name earlier in this file.");

            if (!string.IsNullOrEmpty(code))
            {
                if (code.Length > 100) row.Errors.Add("Item code exceeds 100 characters.");
                else if (existingCodes.Contains(code.ToLowerInvariant())) row.Errors.Add("An item with this code already exists.");
                else if (!seenCodes.Add(code.ToLowerInvariant())) row.Errors.Add("Duplicate item code earlier in this file.");
            }

            if (unit.Length == 0) row.Errors.Add("Unit is required.");
            else if (unit.Length > 50) row.Errors.Add("Unit exceeds 50 characters.");

            if (category.Length == 0) row.Errors.Add("Category is required.");
            else if (!categories.ContainsKey(category.ToLowerInvariant())) row.Errors.Add($"Unknown category \"{category}\" — create it first or fix the spelling.");

            if ((row.Description?.Length ?? 0) > 500) row.Errors.Add("Description exceeds 500 characters.");
            if (row.ReorderThreshold is < 0 or > 1_000_000_000) row.Errors.Add("Reorder threshold must be 0 or greater.");
            if (row.ExpirationWarningDays == 0) row.ExpirationWarningDays = defaults.DefaultExpirationWarningDays;
            if (row.ExpirationWarningDays is < 1 or > 365) row.Errors.Add("Expiration warning days must be between 1 and 365.");
        }

        var result = new ImportResultDto
        {
            Rows = rows,
            Skipped = rows.Count(r => !r.IsValid),
        };

        if (userId is not null)
        {
            foreach (var row in rows.Where(r => r.IsValid))
            {
                _db.InventoryItems.Add(new InventoryItem
                {
                    Name = row.Name!.Trim(),
                    ItemCode = string.IsNullOrWhiteSpace(row.ItemCode) ? null : row.ItemCode.Trim(),
                    Description = string.IsNullOrWhiteSpace(row.Description) ? null : row.Description.Trim(),
                    Unit = row.Unit!.Trim(),
                    CategoryId = categories[row.Category!.Trim().ToLowerInvariant()],
                    ReorderThreshold = row.ReorderThreshold,
                    ExpirationWarningDays = row.ExpirationWarningDays,
                });
                result.Imported++;
            }

            if (result.Imported > 0)
            {
                await _db.SaveChangesAsync();
                await _audit.LogAsync(userId, "ItemsImported", "InventoryItem", null,
                    $"Imported {result.Imported} item(s) from spreadsheet ({result.Skipped} skipped)");
            }
        }

        return result;
    }

    private static List<ImportRowDto> ParseRows(Stream xlsx)
    {
        XLWorkbook wb;
        try { wb = new XLWorkbook(xlsx); }
        catch { throw new InvalidOperationException("The file could not be read — upload an .xlsx workbook (use the template)."); }

        using (wb)
        {
            var ws = wb.Worksheets.FirstOrDefault()
                ?? throw new InvalidOperationException("The workbook has no worksheets.");

            // Map headers by normalized name so column order doesn't matter.
            var headerCells = ws.Row(1).CellsUsed().ToList();
            var col = new Dictionary<string, int>();
            foreach (var cell in headerCells)
                col[Normalize(cell.GetString())] = cell.Address.ColumnNumber;

            string[] required = ["name", "unit", "category"];
            var missing = required.Where(h => !col.ContainsKey(h)).ToList();
            if (missing.Count > 0)
                throw new InvalidOperationException($"Missing column header(s): {string.Join(", ", missing)}. Use the template.");

            int? C(string key) => col.TryGetValue(key, out var c) ? c : null;
            var nameCol = col["name"];
            var unitCol = col["unit"];
            var categoryCol = col["category"];
            var codeCol = C("itemcode") ?? C("code");
            var descCol = C("description");
            var reorderCol = C("reorderthreshold");
            var expiryCol = C("expirationwarningdays") ?? C("expirywarningdays");

            var rows = new List<ImportRowDto>();
            foreach (var row in ws.RowsUsed().Skip(1))
            {
                if (rows.Count >= MaxRows)
                    throw new InvalidOperationException($"The file has more than {MaxRows} rows — split it into smaller files.");

                var dto = new ImportRowDto
                {
                    Row = row.RowNumber(),
                    Name = row.Cell(nameCol).GetString(),
                    Unit = row.Cell(unitCol).GetString(),
                    Category = row.Cell(categoryCol).GetString(),
                    ItemCode = codeCol is int cc ? row.Cell(cc).GetString() : null,
                    Description = descCol is int dc ? row.Cell(dc).GetString() : null,
                };

                // Entirely blank rows are common at the bottom of spreadsheets — skip quietly.
                if (string.IsNullOrWhiteSpace(dto.Name) && string.IsNullOrWhiteSpace(dto.Unit) &&
                    string.IsNullOrWhiteSpace(dto.Category) && string.IsNullOrWhiteSpace(dto.ItemCode))
                    continue;

                if (reorderCol is int rc)
                {
                    var raw = row.Cell(rc).GetString();
                    if (!string.IsNullOrWhiteSpace(raw))
                    {
                        if (decimal.TryParse(raw, out var threshold)) dto.ReorderThreshold = threshold;
                        else dto.Errors.Add($"Reorder threshold \"{raw}\" is not a number.");
                    }
                }

                if (expiryCol is int ec)
                {
                    var raw = row.Cell(ec).GetString();
                    if (!string.IsNullOrWhiteSpace(raw))
                    {
                        if (int.TryParse(raw, out var days)) dto.ExpirationWarningDays = days;
                        else dto.Errors.Add($"Expiration warning days \"{raw}\" is not a whole number.");
                    }
                }

                rows.Add(dto);
            }

            if (rows.Count == 0)
                throw new InvalidOperationException("No data rows found below the header row.");

            return rows;
        }
    }

    private static string Normalize(string header) =>
        new([.. header.ToLowerInvariant().Where(char.IsLetterOrDigit)]);
}
