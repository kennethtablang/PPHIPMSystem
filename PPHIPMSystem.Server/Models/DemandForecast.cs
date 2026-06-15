using System.ComponentModel.DataAnnotations.Schema;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class DemandForecast
{
    public int Id { get; set; }

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public ForecastMethod Method { get; set; }

    public int ForecastYear { get; set; }
    public int ForecastMonth { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ForecastedQuantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? ActualQuantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? SuggestedReorderQuantity { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
