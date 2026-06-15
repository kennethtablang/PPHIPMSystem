using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Forecast;

public class DemandForecastDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public ForecastMethod Method { get; set; }
    public string MethodName => Method.ToString();
    public int ForecastYear { get; set; }
    public int ForecastMonth { get; set; }
    public decimal ForecastedQuantity { get; set; }
    public decimal? ActualQuantity { get; set; }
    public decimal? SuggestedReorderQuantity { get; set; }
    public decimal? ForecastError => ActualQuantity.HasValue ? Math.Abs(ForecastedQuantity - ActualQuantity.Value) : null;
    public DateTime GeneratedAt { get; set; }
}

public class ForecastRequestDto
{
    public int InventoryItemId { get; set; }
    public ForecastMethod? Method { get; set; }
    public int PeriodCount { get; set; } = 3;
}

public class ConsumptionRecordDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal QuantityConsumed { get; set; }
}

public class CreateConsumptionRecordDto
{
    public int InventoryItemId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal QuantityConsumed { get; set; }
}
