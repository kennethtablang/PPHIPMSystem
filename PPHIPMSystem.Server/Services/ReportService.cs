using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Report;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _db;

    public ReportService(ApplicationDbContext db) => _db = db;

    public async Task<ConsumptionSummaryDto> GetConsumptionReportAsync(ReportFilterDto filter)
    {
        var year = filter.Year ?? DateTime.UtcNow.Year;

        var query = _db.ConsumptionRecords.AsNoTracking()
            .Include(c => c.InventoryItem).ThenInclude(i => i.Category)
            .Where(c => c.Year == year);

        if (filter.CategoryId.HasValue)
            query = query.Where(c => c.InventoryItem.CategoryId == filter.CategoryId.Value);
        if (filter.ItemId.HasValue)
            query = query.Where(c => c.InventoryItemId == filter.ItemId.Value);

        var records = await query.ToListAsync();

        if (!records.Any())
            return new ConsumptionSummaryDto();

        var byMonth = records
            .GroupBy(c => c.Month)
            .Select(g => new ConsumptionMonthlyTotalDto { Month = g.Key, TotalQuantity = g.Sum(c => c.QuantityConsumed) })
            .OrderBy(m => m.Month)
            .ToList();

        var peakMonth = byMonth.MaxBy(m => m.TotalQuantity);

        var total = records.Sum(c => c.QuantityConsumed);

        var byCategory = records
            .GroupBy(c => new { c.InventoryItem.CategoryId, Name = c.InventoryItem.Category?.Name })
            .Select(g =>
            {
                var qty = g.Sum(c => c.QuantityConsumed);
                return new ConsumptionCategoryTotalDto
                {
                    CategoryId = g.Key.CategoryId,
                    Category = string.IsNullOrWhiteSpace(g.Key.Name) ? "Uncategorized" : g.Key.Name,
                    TotalQuantity = qty,
                    UniqueItems = g.Select(c => c.InventoryItemId).Distinct().Count(),
                    SharePercent = total > 0 ? Math.Round(qty / total * 100, 2) : 0
                };
            })
            .OrderByDescending(c => c.TotalQuantity)
            .ToList();

        var topItems = records
            .GroupBy(c => c.InventoryItemId)
            .Select(g =>
            {
                var item = g.First().InventoryItem;
                return new ConsumptionTopItemDto
                {
                    ItemId = item.Id,
                    ItemName = item.Name,
                    Category = item.Category?.Name ?? string.Empty,
                    TotalQuantity = g.Sum(c => c.QuantityConsumed),
                    Unit = item.Unit
                };
            })
            .OrderByDescending(i => i.TotalQuantity)
            .Take(10)
            .ToList();

        return new ConsumptionSummaryDto
        {
            TotalQuantity = total,
            UniqueItems = records.Select(c => c.InventoryItemId).Distinct().Count(),
            PeakMonth = peakMonth?.Month,
            PeakMonthQty = peakMonth?.TotalQuantity,
            AvgMonthlyConsumption = byMonth.Any() ? byMonth.Average(m => m.TotalQuantity) : null,
            ByMonth = byMonth,
            ByCategory = byCategory,
            TopItems = topItems
        };
    }

    public async Task<ProcurementSummaryDto> GetProcurementReportAsync(ReportFilterDto filter)
    {
        var query = _db.ProcurementRequests.AsNoTracking()
            .Include(r => r.PurchaseOrder)
            .AsQueryable();

        if (filter.StartDate.HasValue) query = query.Where(r => r.RequestedAt >= filter.StartDate.Value);
        if (filter.EndDate.HasValue) query = query.Where(r => r.RequestedAt <= filter.EndDate.Value);
        if (filter.DepartmentId.HasValue) query = query.Where(r => r.DepartmentId == filter.DepartmentId.Value);

        var requests = await query.ToListAsync();

        var pos = requests
            .Where(r => r.PurchaseOrder != null)
            .Select(r => r.PurchaseOrder!)
            .ToList();

        var byStatus = requests
            .GroupBy(r => r.Status.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        return new ProcurementSummaryDto
        {
            TotalRequests = requests.Count,
            FullyApproved = requests.Count(r => r.Status == ProcurementStatus.FullyApproved
                || r.Status == ProcurementStatus.PurchaseOrderGenerated
                || r.Status == ProcurementStatus.Delivered),
            TotalPOs = pos.Count,
            DeliveredPOs = pos.Count(po => po.IsDelivered),
            TotalPOAmount = pos.Sum(po => po.TotalAmount),
            ByStatus = byStatus
        };
    }

    public async Task<ItemRankingsDto> GetItemRankingsAsync(ReportFilterDto filter)
    {
        var year = filter.Year ?? DateTime.UtcNow.Year;

        var consumptionQuery = _db.ConsumptionRecords.AsNoTracking().Where(c => c.Year == year);
        // Cancelled/rejected requests never turn into real purchases, even if a
        // PO row was generated before the request was pulled.
        var poItemQuery = _db.PurchaseOrderItems.AsNoTracking()
            .Where(pi => pi.PurchaseOrder.GeneratedAt.Year == year
                && pi.PurchaseOrder.ProcurementRequest.Status != ProcurementStatus.Cancelled
                && pi.PurchaseOrder.ProcurementRequest.Status != ProcurementStatus.Rejected);

        if (filter.CategoryId.HasValue)
        {
            consumptionQuery = consumptionQuery.Where(c => c.InventoryItem.CategoryId == filter.CategoryId.Value);
            poItemQuery = poItemQuery.Where(pi => pi.InventoryItem.CategoryId == filter.CategoryId.Value);
        }

        var used = await consumptionQuery
            .GroupBy(c => c.InventoryItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(c => c.QuantityConsumed) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty);

        var procured = await poItemQuery
            .GroupBy(pi => pi.InventoryItemId)
            .Select(g => new
            {
                ItemId = g.Key,
                Qty = g.Sum(pi => pi.QuantityOrdered),
                PoCount = g.Select(pi => pi.PurchaseOrderId).Distinct().Count(),
                Amount = g.Sum(pi => pi.QuantityOrdered * pi.UnitCost)
            })
            .ToDictionaryAsync(x => x.ItemId);

        var itemIds = used.Keys.Union(procured.Keys).ToList();

        var items = await _db.InventoryItems.AsNoTracking()
            .Where(i => itemIds.Contains(i.Id))
            .Select(i => new { i.Id, i.Name, i.Unit, i.CategoryId, CategoryName = i.Category.Name })
            .ToListAsync();

        var rankings = items
            .Select(i =>
            {
                procured.TryGetValue(i.Id, out var p);
                return new ItemRankingDto
                {
                    ItemId = i.Id,
                    ItemName = i.Name,
                    CategoryId = i.CategoryId,
                    Category = string.IsNullOrWhiteSpace(i.CategoryName) ? "Uncategorized" : i.CategoryName,
                    Unit = i.Unit,
                    QuantityUsed = used.GetValueOrDefault(i.Id),
                    QuantityProcured = p?.Qty ?? 0,
                    PurchaseOrderCount = p?.PoCount ?? 0,
                    ProcuredAmount = p?.Amount ?? 0
                };
            })
            .OrderBy(i => i.ItemName)
            .ToList();

        // Every active category is offered in the dropdown, even ones with no
        // activity this year, so the list doesn't shift from year to year.
        var categories = await _db.Categories.AsNoTracking()
            .Where(c => c.IsActive)
            .Select(c => new ItemRankingCategoryDto { CategoryId = c.Id, Category = c.Name })
            .ToListAsync();
        foreach (var missing in rankings
            .Where(r => categories.All(c => c.CategoryId != r.CategoryId))
            .DistinctBy(r => r.CategoryId))
        {
            categories.Add(new ItemRankingCategoryDto { CategoryId = missing.CategoryId, Category = missing.Category });
        }

        return new ItemRankingsDto
        {
            Year = year,
            Categories = categories.OrderBy(c => c.Category).ToList(),
            Items = rankings
        };
    }

    public async Task<ForecastSummaryDto> GetForecastAccuracyReportAsync(ReportFilterDto filter)
    {
        var year = filter.Year ?? DateTime.UtcNow.Year;

        var query = _db.DemandForecasts
            .Include(f => f.InventoryItem)
            .Where(f => f.ForecastYear == year);

        if (filter.ItemId.HasValue)
            query = query.Where(f => f.InventoryItemId == filter.ItemId.Value);

        var forecasts = await query.AsNoTracking().ToListAsync();

        var itemForecasts = forecasts
            .GroupBy(f => f.InventoryItemId)
            .Select(g =>
            {
                var latest = g.OrderByDescending(f => f.ForecastYear).ThenByDescending(f => f.ForecastMonth).First();
                var item = latest.InventoryItem;
                var evaluated = g.Where(f => f.ActualQuantity.HasValue).ToList();
                return new ItemForecastSummaryDto
                {
                    ItemId = item.Id,
                    ItemName = item.Name,
                    Method = latest.Method.ToString(),
                    LatestForecast = latest.ForecastedQuantity,
                    SuggestedReorder = latest.SuggestedReorderQuantity,
                    CurrentStock = item.QuantityOnHand,
                    IsBelowReorder = item.QuantityOnHand < item.ReorderThreshold,
                    EvaluatedForecasts = evaluated.Count,
                    MeanAbsoluteError = evaluated.Count > 0
                        ? Math.Round(evaluated.Average(f => Math.Abs(f.ForecastedQuantity - f.ActualQuantity!.Value)), 2)
                        : null
                };
            })
            .OrderBy(i => i.ItemName)
            .ToList();

        var allEvaluated = forecasts.Where(f => f.ActualQuantity.HasValue).ToList();

        return new ForecastSummaryDto
        {
            TotalForecasts = forecasts.Count,
            MovingAverageCount = forecasts.Count(f => f.Method == ForecastMethod.MovingAverage),
            ExpSmoothingCount = forecasts.Count(f => f.Method == ForecastMethod.ExponentialSmoothing),
            ItemsWithForecast = forecasts.Select(f => f.InventoryItemId).Distinct().Count(),
            EvaluatedForecasts = allEvaluated.Count,
            OverallMae = allEvaluated.Count > 0
                ? Math.Round(allEvaluated.Average(f => Math.Abs(f.ForecastedQuantity - f.ActualQuantity!.Value)), 2)
                : null,
            ItemForecasts = itemForecasts
        };
    }
}
