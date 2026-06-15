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

        var query = _db.ConsumptionRecords
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

        var topItems = records
            .GroupBy(c => c.InventoryItem)
            .Select(g => new ConsumptionTopItemDto
            {
                ItemId = g.Key.Id,
                ItemName = g.Key.Name,
                Category = g.Key.Category?.Name ?? string.Empty,
                TotalQuantity = g.Sum(c => c.QuantityConsumed),
                Unit = g.Key.Unit
            })
            .OrderByDescending(i => i.TotalQuantity)
            .Take(10)
            .ToList();

        return new ConsumptionSummaryDto
        {
            TotalQuantity = records.Sum(c => c.QuantityConsumed),
            UniqueItems = records.Select(c => c.InventoryItemId).Distinct().Count(),
            PeakMonth = peakMonth?.Month,
            PeakMonthQty = peakMonth?.TotalQuantity,
            AvgMonthlyConsumption = byMonth.Any() ? byMonth.Average(m => m.TotalQuantity) : null,
            ByMonth = byMonth,
            TopItems = topItems
        };
    }

    public async Task<ProcurementSummaryDto> GetProcurementReportAsync(ReportFilterDto filter)
    {
        var query = _db.ProcurementRequests
            .Include(r => r.PurchaseOrder).ThenInclude(po => po!.Supplier)
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

        var topSuppliers = pos
            .Where(po => po.Supplier != null)
            .GroupBy(po => new { po.SupplierId, po.Supplier.Name })
            .Select(g => new ProcurementTopSupplierDto
            {
                SupplierId = g.Key.SupplierId,
                SupplierName = g.Key.Name,
                PoCount = g.Count(),
                TotalAmount = g.Sum(po => po.TotalAmount)
            })
            .OrderByDescending(s => s.TotalAmount)
            .Take(5)
            .ToList();

        return new ProcurementSummaryDto
        {
            TotalRequests = requests.Count,
            FullyApproved = requests.Count(r => r.Status == ProcurementStatus.FullyApproved
                || r.Status == ProcurementStatus.PurchaseOrderGenerated
                || r.Status == ProcurementStatus.Delivered),
            TotalPOs = pos.Count,
            DeliveredPOs = pos.Count(po => po.IsDelivered),
            TotalPOAmount = pos.Sum(po => po.TotalAmount),
            ByStatus = byStatus,
            TopSuppliers = topSuppliers
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

        var forecasts = await query.ToListAsync();

        var itemForecasts = forecasts
            .GroupBy(f => f.InventoryItem)
            .Select(g =>
            {
                var latest = g.OrderByDescending(f => f.ForecastYear).ThenByDescending(f => f.ForecastMonth).First();
                var item = g.Key;
                return new ItemForecastSummaryDto
                {
                    ItemId = item.Id,
                    ItemName = item.Name,
                    Method = latest.Method.ToString(),
                    LatestForecast = latest.ForecastedQuantity,
                    SuggestedReorder = latest.SuggestedReorderQuantity,
                    CurrentStock = item.QuantityOnHand,
                    IsBelowReorder = item.QuantityOnHand < item.ReorderThreshold
                };
            })
            .OrderBy(i => i.ItemName)
            .ToList();

        return new ForecastSummaryDto
        {
            TotalForecasts = forecasts.Count,
            MovingAverageCount = forecasts.Count(f => f.Method == ForecastMethod.MovingAverage),
            ExpSmoothingCount = forecasts.Count(f => f.Method == ForecastMethod.ExponentialSmoothing),
            ItemsWithForecast = forecasts.Select(f => f.InventoryItemId).Distinct().Count(),
            ItemForecasts = itemForecasts
        };
    }
}
