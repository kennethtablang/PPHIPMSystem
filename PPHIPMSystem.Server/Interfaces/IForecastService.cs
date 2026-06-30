using PPHIPMSystem.Server.DTOs.Forecast;

namespace PPHIPMSystem.Server.Interfaces;

public interface IForecastService
{
    Task<IEnumerable<DemandForecastDto>> GetForecastsAsync(int? itemId, int? year);
    Task<IEnumerable<DemandForecastDto>> GenerateForecastAsync(ForecastRequestDto dto);
    Task<IEnumerable<ConsumptionRecordDto>> GetConsumptionRecordsAsync(int itemId);
    Task<ConsumptionRecordDto> UpsertConsumptionRecordAsync(CreateConsumptionRecordDto dto);
    Task<bool> SyncConsumptionRecordsAsync(int itemId);
}
