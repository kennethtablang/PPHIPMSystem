using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

public class ConsumptionRecord
{
    public int Id { get; set; }

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public int Year { get; set; }
    public int Month { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityConsumed { get; set; }

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
