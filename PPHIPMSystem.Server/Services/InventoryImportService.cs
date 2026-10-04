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

        string[] headers = ["Name", "Brand", "Item Code", "Description", "Unit", "Category", "Reorder Threshold", "Expiration Warning Days"];
        for (var c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style.Font.SetBold().Font.SetFontColor(XLColor.White)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1A6A36"));
        }

        // Example row to make the expected shape obvious; delete before importing.
        ws.Cell(2, 1).Value = "Paracetamol 500mg";
        ws.Cell(2, 2).Value = "Biogesic";
        ws.Cell(2, 3).Value = "MED-0001";
        ws.Cell(2, 4).Value = "Analgesic / antipyretic";
        ws.Cell(2, 5).Value = "tablet";
        ws.Cell(2, 6).Value = "Drugs and Medicines";
        ws.Cell(2, 7).Value = 20;
        ws.Cell(2, 8).Value = 60;

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public Task<ImportResultDto> PreviewAsync(Stream xlsx) => ProcessAsync(xlsx, userId: null);

    public Task<ImportResultDto> ImportAsync(Stream xlsx, string userId) => ProcessAsync(xlsx, userId);

    // An item is identified by Category + Description/Generic Name + Brand +
    // Unit (see ItemIdentity). Rows may name a category that doesn't exist
    // yet, so the key uses the category's name rather than its id.
    private static string ItemKey(string name, string? brand, string? unit, string category) =>
        $"{ItemIdentity.Canonical(category)}|{ItemIdentity.Canonical(name)}|{ItemIdentity.Canonical(brand)}|{ItemIdentity.Unit(unit)}";

    private sealed record KnownItem(string Name, string? Brand, string? Code, string Label);

    // userId == null → validate only; otherwise persist the valid rows.
    private async Task<ImportResultDto> ProcessAsync(Stream xlsx, string? userId)
    {
        var rows = ParseRows(xlsx);

        var categories = await _db.Categories.AsNoTracking()
            .ToDictionaryAsync(c => c.Name.Trim().ToLowerInvariant(), c => c.Id);
        var existingItems = await _db.InventoryItems.AsNoTracking()
            .Where(i => i.IsActive)
            .Select(i => new { i.Name, i.Brand, i.Unit, i.ItemCode, Category = i.Category.Name })
            .ToListAsync();
        var existingKeys = existingItems.Select(i => ItemKey(i.Name, i.Brand, i.Unit, i.Category)).ToHashSet();
        // Near-identical items (same words, unit and compatible brand) — flagged, not blocked.
        var similarExisting = existingItems
            .GroupBy(i => ItemIdentity.SimilarBucket(i.Name, i.Unit))
            .ToDictionary(g => g.Key, g => g.Select(i => new KnownItem(i.Name, i.Brand, i.ItemCode, $"existing item {i.ItemCode ?? i.Name}")).ToList());
        var existingCodes = (await _db.InventoryItems.AsNoTracking()
                .Where(i => i.ItemCode != null).Select(i => i.ItemCode!).ToListAsync())
            .Select(c => c.Trim().ToLowerInvariant()).ToHashSet();
        var defaults = await _settings.GetAsync();

        var seenKeys = new HashSet<string>();
        var seenSimilar = new Dictionary<string, List<KnownItem>>();
        var seenCodes = new HashSet<string>();
        // Unknown categories are created on import rather than rejected; keep
        // the first spelling seen for each.
        var newCategories = new Dictionary<string, string>();

        foreach (var row in rows)
        {
            var name = row.Name?.Trim() ?? "";
            var brand = string.IsNullOrWhiteSpace(row.Brand) ? null : row.Brand.Trim();
            var code = row.ItemCode?.Trim();
            var unit = row.Unit?.Trim() ?? "";
            var category = row.Category?.Trim() ?? "";
            var key = ItemKey(name, brand, unit, category);
            const string label = "the same category, description, brand and unit";

            if (name.Length == 0) row.Errors.Add("Name is required.");
            else if (name.Length > 200) row.Errors.Add("Name exceeds 200 characters.");
            else if (existingKeys.Contains(key)) row.Errors.Add($"An item with {label} already exists.");
            else if (!seenKeys.Add(key)) row.Errors.Add($"Duplicate of an earlier row with {label}.");
            else
            {
                var bucket = ItemIdentity.SimilarBucket(name, unit);
                var match = (similarExisting.GetValueOrDefault(bucket) ?? [])
                    .Concat(seenSimilar.GetValueOrDefault(bucket) ?? [])
                    .FirstOrDefault(k => ItemIdentity.BrandsCompatible(k.Brand, brand));
                if (match is not null)
                    row.Warnings.Add($"Possible duplicate of {match.Label} \"{match.Name}\"{(match.Brand is null ? "" : $" [{match.Brand}]")} — check before importing.");
                if (!seenSimilar.TryGetValue(bucket, out var list)) seenSimilar[bucket] = list = [];
                list.Add(new KnownItem(name, brand, code, $"row {row.Row}"));
            }

            if ((brand?.Length ?? 0) > 150) row.Errors.Add("Brand exceeds 150 characters.");

            if (!string.IsNullOrEmpty(code))
            {
                if (code.Length > 100) row.Errors.Add("Item code exceeds 100 characters.");
                else if (existingCodes.Contains(code.ToLowerInvariant())) row.Errors.Add("An item with this code already exists.");
                else if (!seenCodes.Add(code.ToLowerInvariant())) row.Errors.Add("Duplicate item code earlier in this file.");
            }

            if (unit.Length == 0) row.Errors.Add("Unit is required.");
            else if (unit.Length > 50) row.Errors.Add("Unit exceeds 50 characters.");
            else
            {
                var normalized = NormalizeUnit(unit);
                if (normalized != unit) row.Warnings.Add($"Unit \"{unit}\" recorded as \"{normalized}\".");
                row.Unit = normalized;
            }

            if (category.Length == 0) row.Errors.Add("Category is required.");
            else if (category.Length > 150) row.Errors.Add("Category exceeds 150 characters.");
            else if (!categories.ContainsKey(category.ToLowerInvariant()))
            {
                newCategories.TryAdd(category.ToLowerInvariant(), category);
                row.Warnings.Add($"New category \"{newCategories[category.ToLowerInvariant()]}\" will be created.");
            }

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
            var valid = rows.Where(r => r.IsValid).ToList();

            // Only create the categories that an imported row actually uses.
            var createdCategories = new Dictionary<string, Category>();
            foreach (var row in valid)
            {
                var catKey = row.Category!.Trim().ToLowerInvariant();
                if (categories.ContainsKey(catKey) || createdCategories.ContainsKey(catKey)) continue;
                var cat = new Category { Name = newCategories[catKey] };
                createdCategories[catKey] = cat;
                _db.Categories.Add(cat);
            }

            foreach (var row in valid)
            {
                var catKey = row.Category!.Trim().ToLowerInvariant();
                var item = new InventoryItem
                {
                    Name = row.Name!.Trim(),
                    Brand = string.IsNullOrWhiteSpace(row.Brand) ? null : row.Brand.Trim(),
                    ItemCode = string.IsNullOrWhiteSpace(row.ItemCode) ? null : row.ItemCode.Trim(),
                    Description = string.IsNullOrWhiteSpace(row.Description) ? null : row.Description.Trim(),
                    Unit = row.Unit!,
                    ReorderThreshold = row.ReorderThreshold,
                    ExpirationWarningDays = row.ExpirationWarningDays,
                };
                if (createdCategories.TryGetValue(catKey, out var cat)) item.Category = cat;
                else item.CategoryId = categories[catKey];
                _db.InventoryItems.Add(item);
                result.Imported++;
            }

            if (result.Imported > 0)
            {
                await _db.SaveChangesAsync();
                result.CategoriesCreated = [.. createdCategories.Values.Select(c => c.Name)];
                var catNote = result.CategoriesCreated.Count > 0
                    ? $"; created categories: {string.Join(", ", result.CategoriesCreated)}" : "";
                await _audit.LogAsync(userId, "ItemsImported", "InventoryItem", null,
                    $"Imported {result.Imported} item(s) from spreadsheet ({result.Skipped} skipped){catNote}");
            }
        }

        return result;
    }

    // Spreadsheets spell the same unit many ways (pc/pcs/PCS, box/bxs/boxes).
    // Map the common variants onto one lowercase singular form so stock,
    // forms and reports group consistently. Unknown units pass through as-is.
    private static readonly Dictionary<string, string> UnitAliases = new()
    {
        ["pc"] = "pc", ["pcs"] = "pc", ["piece"] = "pc", ["pieces"] = "pc",
        ["box"] = "box", ["boxes"] = "box", ["bx"] = "box", ["bxs"] = "box",
        ["bot"] = "bottle", ["bots"] = "bottle", ["bottle"] = "bottle", ["bottles"] = "bottle", ["botte"] = "bottle",
        ["tab"] = "tablet", ["tabs"] = "tablet", ["tablet"] = "tablet", ["tablets"] = "tablet",
        ["cap"] = "capsule", ["caps"] = "capsule", ["caaps"] = "capsule", ["capsule"] = "capsule", ["capsules"] = "capsule",
        ["amp"] = "ampule", ["amps"] = "ampule", ["ampule"] = "ampule", ["ampules"] = "ampule", ["ampoule"] = "ampule",
        ["vial"] = "vial", ["vials"] = "vial",
        ["set"] = "set", ["sets"] = "set",
        ["kit"] = "kit", ["kits"] = "kit",
        ["pack"] = "pack", ["packs"] = "pack", ["pck"] = "pack",
        ["roll"] = "roll", ["rolls"] = "roll",
        ["unit"] = "unit", ["units"] = "unit",
        ["tube"] = "tube", ["tubes"] = "tube", ["tubs"] = "tube",
        ["gal"] = "gallon", ["gallon"] = "gallon", ["gallons"] = "gallon",
        ["cyl"] = "cylinder", ["cyls"] = "cylinder", ["cylinder"] = "cylinder",
        ["neb"] = "nebule", ["nebule"] = "nebule", ["nebules"] = "nebule",
        ["pad"] = "pad", ["pads"] = "pad",
        ["pair"] = "pair", ["pairs"] = "pair",
        ["sachet"] = "sachet", ["sachets"] = "sachet",
        ["ream"] = "ream", ["reams"] = "ream",
        ["strip"] = "strip", ["strips"] = "strip",
        ["bag"] = "bag", ["bags"] = "bag",
        ["kg"] = "kg", ["kgs"] = "kg",
        ["liter"] = "liter", ["liters"] = "liter",
    };

    public static string NormalizeUnit(string unit)
    {
        var key = unit.Trim().TrimEnd('.').ToLowerInvariant();
        return UnitAliases.TryGetValue(key, out var canonical) ? canonical : unit.Trim();
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

            // The hospital catalog export calls the name column "Description/Generic Name".
            if (!col.ContainsKey("name"))
                foreach (var alias in new[] { "descriptiongenericname", "genericname", "itemname" })
                    if (col.TryGetValue(alias, out var c)) { col["name"] = c; break; }

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
            var brandCol = C("brand");
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
                    Brand = brandCol is int bc ? row.Cell(bc).GetString() : null,
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
