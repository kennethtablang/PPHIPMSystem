using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Inventory;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

// Finds items entered more than once and folds duplicates into a single
// record, so the item list stays clean and requests all point at one item.
// Matching rules live in ItemIdentity.
public class InventoryDuplicateService : IInventoryDuplicateService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _audit;

    public InventoryDuplicateService(ApplicationDbContext db, IAuditLogService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<List<DuplicateGroupDto>> FindDuplicateGroupsAsync()
    {
        var items = await _db.InventoryItems.AsNoTracking()
            .Include(i => i.Category)
            .Where(i => i.IsActive)
            .ToListAsync();

        var groups = new List<DuplicateGroupDto>();
        foreach (var bucket in items.GroupBy(i => ItemIdentity.SimilarBucket(i.Name, i.Unit)).Where(b => b.Count() > 1))
        {
            // Two different brands are two different products; a blank brand
            // is only grouped when it can belong to a single brand.
            var brands = bucket.Select(i => ItemIdentity.Canonical(i.Brand)).Where(b => b.Length > 0).Distinct().Count();
            var sets = brands <= 1
                ? [bucket.ToList()]
                : bucket.GroupBy(i => ItemIdentity.Canonical(i.Brand)).Select(g => g.ToList()).ToList();

            foreach (var set in sets.Where(s => s.Count > 1))
                groups.Add(BuildGroup(set));
        }

        return [.. groups
            .OrderBy(g => g.MatchType == "Exact" ? 0 : 1)
            .ThenBy(g => g.Items[0].Name, StringComparer.OrdinalIgnoreCase)];
    }

    private static DuplicateGroupDto BuildGroup(List<InventoryItem> set)
    {
        var exact = set.Select(i => ItemIdentity.ExactKey(i.Name, i.Brand, i.Unit, i.CategoryId)).Distinct().Count() == 1;

        var diffs = new List<string>();
        if (set.Select(i => i.CategoryId).Distinct().Count() > 1) diffs.Add("Category");
        if (set.Select(i => ItemIdentity.Canonical(i.Name)).Distinct().Count() > 1) diffs.Add("Description wording");
        else if (set.Select(i => i.Name.Trim()).Distinct().Count() > 1) diffs.Add("Description punctuation/case");
        if (set.Select(i => ItemIdentity.Canonical(i.Brand)).Distinct().Count() > 1) diffs.Add("Brand missing on some");
        if (set.Select(i => i.Unit.Trim().ToLowerInvariant()).Distinct().Count() > 1) diffs.Add("Unit spelling");
        if (set.Where(i => i.ItemCode != null).Select(i => i.ItemCode).Distinct().Count() > 1) diffs.Add("Item code");

        return new DuplicateGroupDto
        {
            MatchType = exact ? "Exact" : "Similar",
            Differences = diffs,
            Items = [.. set.OrderBy(i => i.CreatedAt).Select(ToDto)],
        };
    }

    public async Task<List<DuplicateItemDto>> FindSimilarAsync(string name, string? brand, string? unit, int? categoryId, int? excludeId)
    {
        if (string.IsNullOrWhiteSpace(name)) return [];

        // Narrow in SQL on the first word, then apply the full rule in memory.
        var firstWord = ItemIdentity.Canonical(name).Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        var query = _db.InventoryItems.AsNoTracking().Include(i => i.Category).Where(i => i.IsActive);
        if (excludeId.HasValue) query = query.Where(i => i.Id != excludeId.Value);
        if (!string.IsNullOrEmpty(firstWord)) query = query.Where(i => i.Name.Contains(firstWord));

        var candidates = await query.ToListAsync();
        var hasUnit = !string.IsNullOrWhiteSpace(unit);
        var similarName = ItemIdentity.SimilarName(name);

        return [.. candidates
            .Where(i => ItemIdentity.SimilarName(i.Name) == similarName
                        && ItemIdentity.BrandsCompatible(i.Brand, brand)
                        // While the unit is still blank, match on name/brand alone.
                        && (!hasUnit || ItemIdentity.Unit(i.Unit) == ItemIdentity.Unit(unit)))
            .Select(i =>
            {
                var dto = ToDto(i);
                dto.IsExactMatch = hasUnit && categoryId.HasValue
                    && ItemIdentity.ExactKey(i.Name, i.Brand, i.Unit, i.CategoryId) == ItemIdentity.ExactKey(name, brand, unit, categoryId.Value);
                return dto;
            })
            .OrderByDescending(d => d.IsExactMatch)
            .Take(10)];
    }

    public async Task<MergeResultDto> MergeAsync(MergeItemsDto dto, string userId)
    {
        var mergeIds = dto.MergeItemIds.Distinct().Where(id => id != dto.KeepItemId).ToList();
        if (mergeIds.Count == 0)
            throw new InvalidOperationException("Select at least one other item to merge into the kept item.");

        var all = await _db.InventoryItems
            .Where(i => i.IsActive && (i.Id == dto.KeepItemId || mergeIds.Contains(i.Id)))
            .ToListAsync();
        var keep = all.FirstOrDefault(i => i.Id == dto.KeepItemId)
            ?? throw new InvalidOperationException("The item to keep was not found or is inactive.");
        var merged = all.Where(i => i.Id != keep.Id).ToList();
        if (merged.Count != mergeIds.Count)
            throw new InvalidOperationException("One or more items to merge were not found or are already inactive.");

        // Quantities are added together, so they must be counted in the same unit.
        var keepUnit = ItemIdentity.Unit(keep.Unit);
        var mismatch = merged.FirstOrDefault(m => ItemIdentity.Unit(m.Unit) != keepUnit);
        if (mismatch is not null)
            throw new InvalidOperationException(
                $"\"{mismatch.Name}\" is counted in \"{mismatch.Unit}\" but the kept item uses \"{keep.Unit}\". Only items with the same unit can be merged.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        // History and open documents move to the kept item.
        await _db.ItemBatches.Where(x => mergeIds.Contains(x.InventoryItemId)).ExecuteUpdateAsync(s => s.SetProperty(x => x.InventoryItemId, keep.Id));
        await _db.StockMovements.Where(x => mergeIds.Contains(x.InventoryItemId)).ExecuteUpdateAsync(s => s.SetProperty(x => x.InventoryItemId, keep.Id));
        await _db.StockAdjustments.Where(x => mergeIds.Contains(x.InventoryItemId)).ExecuteUpdateAsync(s => s.SetProperty(x => x.InventoryItemId, keep.Id));
        await _db.ProcurementRequestItems.Where(x => mergeIds.Contains(x.InventoryItemId)).ExecuteUpdateAsync(s => s.SetProperty(x => x.InventoryItemId, keep.Id));
        await _db.PurchaseOrderItems.Where(x => mergeIds.Contains(x.InventoryItemId)).ExecuteUpdateAsync(s => s.SetProperty(x => x.InventoryItemId, keep.Id));
        // Forecasts are derived data; the kept item's are regenerated from the combined history.
        await _db.DemandForecasts.Where(x => mergeIds.Contains(x.InventoryItemId)).ExecuteDeleteAsync();

        // One row per (department, item) and per (item, month): add into the
        // kept item's row where one exists, otherwise re-point.
        var deptStock = await _db.DepartmentStocks
            .Where(x => x.InventoryItemId == keep.Id || mergeIds.Contains(x.InventoryItemId)).ToListAsync();
        var keepDept = deptStock.Where(x => x.InventoryItemId == keep.Id).ToDictionary(x => x.DepartmentId);
        foreach (var row in deptStock.Where(x => x.InventoryItemId != keep.Id))
        {
            if (keepDept.TryGetValue(row.DepartmentId, out var target))
            {
                target.Quantity += row.Quantity;
                target.UpdatedAt = DateTime.UtcNow;
                _db.DepartmentStocks.Remove(row);
            }
            else
            {
                row.InventoryItemId = keep.Id;
                keepDept[row.DepartmentId] = row;
            }
        }

        var consumption = await _db.ConsumptionRecords
            .Where(x => x.InventoryItemId == keep.Id || mergeIds.Contains(x.InventoryItemId)).ToListAsync();
        var keepMonths = consumption.Where(x => x.InventoryItemId == keep.Id).ToDictionary(x => (x.Year, x.Month));
        foreach (var row in consumption.Where(x => x.InventoryItemId != keep.Id))
        {
            if (keepMonths.TryGetValue((row.Year, row.Month), out var target))
            {
                target.QuantityConsumed += row.QuantityConsumed;
                _db.ConsumptionRecords.Remove(row);
            }
            else
            {
                row.InventoryItemId = keep.Id;
                keepMonths[(row.Year, row.Month)] = row;
            }
        }

        // Fill details the kept record is missing from the merged ones.
        var codeToTake = keep.ItemCode is null ? merged.Select(m => m.ItemCode).FirstOrDefault(c => c != null) : null;
        keep.Brand ??= merged.Select(m => m.Brand).FirstOrDefault(b => !string.IsNullOrWhiteSpace(b));
        keep.Description ??= merged.Select(m => m.Description).FirstOrDefault(d => !string.IsNullOrWhiteSpace(d));
        keep.QuantityOnHand += merged.Sum(m => m.QuantityOnHand);
        keep.UpdatedAt = DateTime.UtcNow;

        var mergedSummary = string.Join("; ", merged.Select(m => $"#{m.Id} {m.ItemCode ?? "(no code)"} {m.Name}{(m.Brand is null ? "" : $" [{m.Brand}]")} qty {m.QuantityOnHand}"));
        foreach (var m in merged)
        {
            m.IsActive = false;
            m.QuantityOnHand = 0;
            m.ItemCode = null; // release the code so it can't collide with the kept item
            m.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        // Item codes are unique, so the kept item can only take one after it's released above.
        if (codeToTake is not null)
        {
            keep.ItemCode = codeToTake;
            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();

        await _audit.LogAsync(userId, "ItemsMerged", "InventoryItem", keep.Id,
            $"Merged {merged.Count} duplicate item(s) into #{keep.Id} {keep.ItemCode ?? "(no code)"} {keep.Name}: {mergedSummary}");

        return new MergeResultDto { KeptItemId = keep.Id, MergedCount = merged.Count, NewQuantityOnHand = keep.QuantityOnHand };
    }

    private static DuplicateItemDto ToDto(InventoryItem i) => new()
    {
        Id = i.Id,
        ItemCode = i.ItemCode,
        Name = i.Name,
        Brand = i.Brand,
        Unit = i.Unit,
        CategoryId = i.CategoryId,
        CategoryName = i.Category?.Name ?? "",
        QuantityOnHand = i.QuantityOnHand,
        CreatedAt = i.CreatedAt,
    };
}
