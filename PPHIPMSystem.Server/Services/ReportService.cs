using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Report;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _db;

    public ReportService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<ConsumptionReportDto>> GetConsumptionReportAsync(ReportFilterDto filter)
    {
        var query = _db.ConsumptionRecords
            .Include(c => c.InventoryItem).ThenInclude(i => i.Category)
            .AsQueryable();

        if (filter.StartDate.HasValue)
        {
            var start = filter.StartDate.Value;
            query = query.Where(c => c.Year > start.Year || (c.Year == start.Year && c.Month >= start.Month));
        }
        if (filter.EndDate.HasValue)
        {
            var end = filter.EndDate.Value;
            query = query.Where(c => c.Year < end.Year || (c.Year == end.Year && c.Month <= end.Month));
        }
        if (filter.CategoryId.HasValue)
            query = query.Where(c => c.InventoryItem.CategoryId == filter.CategoryId.Value);
        if (filter.ItemId.HasValue)
            query = query.Where(c => c.InventoryItemId == filter.ItemId.Value);

        var records = await query.ToListAsync();

        return records
            .GroupBy(c => c.InventoryItem)
            .Select(g => new ConsumptionReportDto
            {
                ItemName = g.Key.Name,
                ItemCode = g.Key.ItemCode,
                CategoryName = g.Key.Category.Name,
                Unit = g.Key.Unit,
                TotalConsumed = g.Sum(c => c.QuantityConsumed),
                MonthlyData = g.OrderBy(c => c.Year).ThenBy(c => c.Month)
                    .Select(c => new MonthlyConsumptionDto
                    {
                        Year = c.Year,
                        Month = c.Month,
                        QuantityConsumed = c.QuantityConsumed
                    })
            });
    }

    public async Task<IEnumerable<ProcurementReportDto>> GetProcurementReportAsync(ReportFilterDto filter)
    {
        var query = _db.ProcurementRequests
            .Include(r => r.Department)
            .Include(r => r.RequestedByUser)
            .Include(r => r.Approvals)
            .Include(r => r.PurchaseOrder)
            .AsQueryable();

        if (filter.StartDate.HasValue) query = query.Where(r => r.RequestedAt >= filter.StartDate.Value);
        if (filter.EndDate.HasValue) query = query.Where(r => r.RequestedAt <= filter.EndDate.Value);
        if (filter.DepartmentId.HasValue) query = query.Where(r => r.DepartmentId == filter.DepartmentId.Value);

        var requests = await query.OrderByDescending(r => r.RequestedAt).ToListAsync();

        return requests.Select(r =>
        {
            var finalAction = r.Approvals.OrderByDescending(a => a.ActedAt).FirstOrDefault();
            return new ProcurementReportDto
            {
                RequestNumber = r.RequestNumber,
                DepartmentName = r.Department.Name,
                RequestedBy = $"{r.RequestedByUser.FirstName} {r.RequestedByUser.LastName}",
                Status = r.Status.ToString(),
                RequestedAt = r.RequestedAt,
                FinalActionAt = finalAction?.ActedAt,
                ProcessingDays = finalAction is not null
                    ? (finalAction.ActedAt - r.RequestedAt).TotalDays
                    : null,
                TotalAmount = r.PurchaseOrder?.TotalAmount,
                PONumber = r.PurchaseOrder?.PONumber
            };
        });
    }

    public async Task<IEnumerable<ForecastAccuracyReportDto>> GetForecastAccuracyReportAsync(ReportFilterDto filter)
    {
        var query = _db.DemandForecasts
            .Include(f => f.InventoryItem)
            .Where(f => f.ActualQuantity.HasValue)
            .AsQueryable();

        if (filter.ItemId.HasValue) query = query.Where(f => f.InventoryItemId == filter.ItemId.Value);

        var forecasts = await query.ToListAsync();

        return forecasts
            .GroupBy(f => new { f.InventoryItemId, f.InventoryItem.Name, f.Method })
            .Select(g =>
            {
                var periods = g.Select(f => new ForecastAccuracyPeriodDto
                {
                    Year = f.ForecastYear,
                    Month = f.ForecastMonth,
                    ForecastedQuantity = f.ForecastedQuantity,
                    ActualQuantity = f.ActualQuantity
                }).ToList();

                var errors = periods.Where(p => p.AbsoluteError.HasValue).Select(p => p.AbsoluteError!.Value).ToList();
                return new ForecastAccuracyReportDto
                {
                    ItemName = g.Key.Name,
                    Method = g.Key.Method.ToString(),
                    Periods = periods,
                    MeanAbsoluteError = errors.Any() ? errors.Average() : null
                };
            });
    }
}
