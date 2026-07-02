using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Forecast;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;
using Microsoft.AspNetCore.SignalR;
using PPHIPMSystem.Server.Hubs;

namespace PPHIPMSystem.Server.Services;

public class ForecastService : IForecastService
{
    private const int MaxForecastPeriods = 12;
    private const decimal ReorderBuffer = 1.1m;

    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly IHubContext<ForecastHub> _hubContext;

    public ForecastService(ApplicationDbContext db, IMapper mapper, IHubContext<ForecastHub> hubContext)
    {
        _db = db;
        _mapper = mapper;
        _hubContext = hubContext;
    }

    public async Task<IEnumerable<DemandForecastDto>> GetForecastsAsync(int? itemId, int? year)
    {
        var query = _db.DemandForecasts.AsNoTracking().Include(f => f.InventoryItem).AsQueryable();
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
        var periods = Math.Clamp(dto.PeriodCount, 1, MaxForecastPeriods);

        // FR-5.1: consumption history is derived automatically from issuance movements.
        await SyncConsumptionInternalAsync(dto.InventoryItemId);

        var history = await _db.ConsumptionRecords.AsNoTracking()
            .Where(c => c.InventoryItemId == dto.InventoryItemId)
            .OrderBy(c => c.Year).ThenBy(c => c.Month)
            .ToListAsync();

        if (history.Count == 0)
            throw new InvalidOperationException(
                "No consumption history for this item yet. Record stock issuances or add consumption records first.");

        // Months without a record are months with zero consumption — they must
        // weigh into the averages, so the series is zero-filled to be continuous.
        var series = BuildMonthlySeries(history);

        var forecastedQty = Math.Round(method == ForecastMethod.MovingAverage
            ? ComputeMovingAverage(series, item.MovingAverageWindow)
            : ComputeExponentialSmoothing(series, (double)item.SmoothingConstant), 2);
        var suggestedQty = Math.Round(forecastedQty * ReorderBuffer, 2);

        var startDate = DateTime.UtcNow;
        var targetPeriods = Enumerable.Range(1, periods)
            .Select(p => startDate.AddMonths(p))
            .Select(d => (d.Year, d.Month))
            .ToList();

        var targetYears = targetPeriods.Select(t => t.Year).Distinct().ToList();
        var existing = await _db.DemandForecasts
            .Where(f => f.InventoryItemId == dto.InventoryItemId
                        && f.Method == method
                        && targetYears.Contains(f.ForecastYear))
            .ToListAsync();
        var existingByPeriod = existing.ToDictionary(f => (f.ForecastYear, f.ForecastMonth));

        var forecasts = new List<DemandForecast>();
        foreach (var (year, month) in targetPeriods)
        {
            if (existingByPeriod.TryGetValue((year, month), out var forecast))
            {
                forecast.ForecastedQuantity = forecastedQty;
                forecast.SuggestedReorderQuantity = suggestedQty;
                forecast.GeneratedAt = DateTime.UtcNow;
            }
            else
            {
                forecast = new DemandForecast
                {
                    InventoryItemId = dto.InventoryItemId,
                    Method = method,
                    ForecastYear = year,
                    ForecastMonth = month,
                    ForecastedQuantity = forecastedQty,
                    SuggestedReorderQuantity = suggestedQty
                };
                _db.DemandForecasts.Add(forecast);
            }
            forecast.InventoryItem = item;
            forecasts.Add(forecast);
        }

        await BackfillActualsAsync(dto.InventoryItemId, history);
        await _db.SaveChangesAsync();

        var dtoList = _mapper.Map<IEnumerable<DemandForecastDto>>(forecasts);
        await _hubContext.Clients.All.SendAsync("ReceiveForecastUpdate", dtoList);

        return dtoList;
    }

    public async Task<IEnumerable<ConsumptionRecordDto>> GetConsumptionRecordsAsync(int itemId)
    {
        var records = await _db.ConsumptionRecords.AsNoTracking()
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

        var affected = await _db.DemandForecasts
            .Where(f => f.InventoryItemId == dto.InventoryItemId
                        && f.ForecastYear == dto.Year && f.ForecastMonth == dto.Month)
            .ToListAsync();
        foreach (var f in affected) f.ActualQuantity = dto.QuantityConsumed;

        await _db.SaveChangesAsync();
        await _db.Entry(existing).Reference(c => c.InventoryItem).LoadAsync();
        return _mapper.Map<ConsumptionRecordDto>(existing);
    }

    public async Task<bool> SyncConsumptionRecordsAsync(int itemId)
    {
        var exists = await _db.InventoryItems.AnyAsync(i => i.Id == itemId);
        if (!exists) return false;

        await SyncConsumptionInternalAsync(itemId);
        await BackfillActualsAsync(itemId, history: null);
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task SyncConsumptionInternalAsync(int itemId)
    {
        var grouped = await _db.StockMovements
            .Where(m => m.InventoryItemId == itemId && m.MovementType == StockMovementType.Issuance)
            .GroupBy(m => new { m.MovementDate.Year, m.MovementDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(m => m.Quantity) })
            .ToListAsync();

        if (grouped.Count == 0) return;

        var existingRecords = await _db.ConsumptionRecords
            .Where(c => c.InventoryItemId == itemId)
            .ToDictionaryAsync(c => (c.Year, c.Month));

        var changed = false;
        foreach (var g in grouped)
        {
            if (existingRecords.TryGetValue((g.Year, g.Month), out var record))
            {
                if (record.QuantityConsumed != g.Total)
                {
                    record.QuantityConsumed = g.Total;
                    record.RecordedAt = DateTime.UtcNow;
                    changed = true;
                }
            }
            else
            {
                _db.ConsumptionRecords.Add(new ConsumptionRecord
                {
                    InventoryItemId = itemId,
                    Year = g.Year,
                    Month = g.Month,
                    QuantityConsumed = g.Total
                });
                changed = true;
            }
        }

        if (changed) await _db.SaveChangesAsync();
    }

    // Records actual consumption against past forecasts so accuracy (MAE)
    // can be reported per FR-13.3. Caller is responsible for SaveChanges.
    private async Task BackfillActualsAsync(int itemId, List<ConsumptionRecord>? history)
    {
        history ??= await _db.ConsumptionRecords.AsNoTracking()
            .Where(c => c.InventoryItemId == itemId)
            .ToListAsync();
        if (history.Count == 0) return;

        var consumptionByPeriod = history.ToDictionary(c => (c.Year, c.Month), c => c.QuantityConsumed);
        var now = DateTime.UtcNow;

        var pastForecasts = await _db.DemandForecasts
            .Where(f => f.InventoryItemId == itemId
                        && (f.ForecastYear < now.Year
                            || (f.ForecastYear == now.Year && f.ForecastMonth < now.Month)))
            .ToListAsync();

        foreach (var f in pastForecasts)
        {
            if (consumptionByPeriod.TryGetValue((f.ForecastYear, f.ForecastMonth), out var actual))
                f.ActualQuantity = actual;
        }
    }

    // Builds a continuous month-by-month series from the first recorded month
    // through the last complete month, filling unrecorded months with zero.
    private static List<decimal> BuildMonthlySeries(List<ConsumptionRecord> history)
    {
        var byPeriod = history.ToDictionary(c => (c.Year, c.Month), c => c.QuantityConsumed);

        var start = new DateTime(history[0].Year, history[0].Month, 1);
        var lastRecorded = new DateTime(history[^1].Year, history[^1].Month, 1);
        var lastComplete = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-1);
        var end = lastRecorded > lastComplete ? lastRecorded : lastComplete;

        var series = new List<decimal>();
        for (var d = start; d <= end; d = d.AddMonths(1))
            series.Add(byPeriod.TryGetValue((d.Year, d.Month), out var qty) ? qty : 0m);
        return series;
    }

    private static decimal ComputeMovingAverage(List<decimal> series, int window)
    {
        if (series.Count == 0) return 0m;
        window = Math.Max(1, window);
        return series.TakeLast(window).Average();
    }

    private static decimal ComputeExponentialSmoothing(List<decimal> series, double alpha)
    {
        if (series.Count == 0) return 0m;
        alpha = Math.Clamp(alpha, 0.01, 1.0);
        double smoothed = (double)series[0];
        foreach (var value in series.Skip(1))
        {
            smoothed = alpha * (double)value + (1 - alpha) * smoothed;
        }
        return (decimal)smoothed;
    }
}
