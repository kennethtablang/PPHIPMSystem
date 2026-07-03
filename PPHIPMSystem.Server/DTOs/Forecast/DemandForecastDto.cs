using System.ComponentModel.DataAnnotations;
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
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    public ForecastMethod? Method { get; set; }

    [Range(1, 24)]
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
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    // Bounded so stored rows can never blow up new DateTime(Year, Month, 1)
    // in the forecast series builder.
    [Range(2000, 2100)]
    public int Year { get; set; }

    [Range(1, 12)]
    public int Month { get; set; }

    [Range(0, double.MaxValue)]
    public decimal QuantityConsumed { get; set; }
}
