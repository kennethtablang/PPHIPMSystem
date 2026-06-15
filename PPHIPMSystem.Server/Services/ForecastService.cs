using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Forecast;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class ForecastService : IForecastService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public ForecastService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<DemandForecastDto>> GetForecastsAsync(int? itemId, int? year)
    {
        var query = _db.DemandForecasts.Include(f => f.InventoryItem).AsQueryable();
        if (itemId.HasValue) query = query.Where(f => f.InventoryItemId == itemId.Value);
        if (year.HasValue) query = query.Where(f => f.ForecastYear == year.Value);
        var items = await query.OrderByDescending(f => f.ForecastYear).ThenByDescending(f => f.ForecastMonth).ToListAsync();
        return _mapper.Map<IEnumerable<DemandForecastDto>>(items);
    }

    public async Task<IEnumerable<DemandForecastDto>> GenerateForecastAsync(ForecastRequestDto dto)
    {
        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Item not found.");

        var method = dto.Method ?? item.PreferredForecastMethod;
        var periods = Math.Max(1, dto.PeriodCount);

        var history = await _db.ConsumptionRecords
            .Where(c => c.InventoryItemId == dto.InventoryItemId)
            .OrderBy(c => c.Year).ThenBy(c => c.Month)
            .ToListAsync();

        var forecasts = new List<DemandForecast>();
        var startDate = DateTime.UtcNow;

        for (int p = 0; p < periods; p++)
        {
            var targetDate = startDate.AddMonths(p + 1);
            var forecastedQty = method == ForecastMethod.MovingAverage
                ? ComputeMovingAverage(history, item.MovingAverageWindow)
                : ComputeExponentialSmoothing(history, (double)item.SmoothingConstant);

            var existing = await _db.DemandForecasts.FirstOrDefaultAsync(f =>
                f.InventoryItemId == dto.InventoryItemId &&
                f.ForecastYear == targetDate.Year &&
                f.ForecastMonth == targetDate.Month &&
                f.Method == method);

            if (existing is not null)
            {
                existing.ForecastedQuantity = Math.Round(forecastedQty, 2);
                existing.SuggestedReorderQuantity = Math.Round(forecastedQty * 1.1m, 2);
                existing.GeneratedAt = DateTime.UtcNow;
                forecasts.Add(existing);
            }
            else
            {
                var forecast = new DemandForecast
                {
                    InventoryItemId = dto.InventoryItemId,
                    Method = method,
                    ForecastYear = targetDate.Year,
                    ForecastMonth = targetDate.Month,
                    ForecastedQuantity = Math.Round(forecastedQty, 2),
                    SuggestedReorderQuantity = Math.Round(forecastedQty * 1.1m, 2)
                };
                _db.DemandForecasts.Add(forecast);
                forecasts.Add(forecast);
            }
        }

        await _db.SaveChangesAsync();
        foreach (var f in forecasts) await _db.Entry(f).Reference(x => x.InventoryItem).LoadAsync();
        return _mapper.Map<IEnumerable<DemandForecastDto>>(forecasts);
    }

    public async Task<IEnumerable<ConsumptionRecordDto>> GetConsumptionRecordsAsync(int itemId)
    {
        var records = await _db.ConsumptionRecords
            .Include(c => c.InventoryItem)
            .Where(c => c.InventoryItemId == itemId)
            .OrderBy(c => c.Year).ThenBy(c => c.Month)
            .ToListAsync();
        return _mapper.Map<IEnumerable<ConsumptionRecordDto>>(records);
    }

    public async Task<ConsumptionRecordDto> UpsertConsumptionRecordAsync(CreateConsumptionRecordDto dto)
    {
        var existing = await _db.ConsumptionRecords.FirstOrDefaultAsync(c =>
            c.InventoryItemId == dto.InventoryItemId && c.Year == dto.Year && c.Month == dto.Month);

        if (existing is not null)
        {
            existing.QuantityConsumed = dto.QuantityConsumed;
            existing.RecordedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new ConsumptionRecord
            {
                InventoryItemId = dto.InventoryItemId,
                Year = dto.Year,
                Month = dto.Month,
                QuantityConsumed = dto.QuantityConsumed
            };
            _db.ConsumptionRecords.Add(existing);
        }
        await _db.SaveChangesAsync();
        await _db.Entry(existing).Reference(c => c.InventoryItem).LoadAsync();
        return _mapper.Map<ConsumptionRecordDto>(existing);
    }

    private static decimal ComputeMovingAverage(List<ConsumptionRecord> history, int window)
    {
        if (!history.Any()) return 0m;
        var recent = history.TakeLast(window).Select(c => c.QuantityConsumed).ToList();
        return recent.Average();
    }

    private static decimal ComputeExponentialSmoothing(List<ConsumptionRecord> history, double alpha)
    {
        if (!history.Any()) return 0m;
        double smoothed = (double)history.First().QuantityConsumed;
        foreach (var record in history.Skip(1))
        {
            smoothed = alpha * (double)record.QuantityConsumed + (1 - alpha) * smoothed;
        }
        return (decimal)smoothed;
    }
}
