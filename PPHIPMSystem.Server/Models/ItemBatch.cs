using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

public class ItemBatch
{
    public int Id { get; set; }

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal RemainingQuantity { get; set; }

    public DateTime? ExpirationDate { get; set; }
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;

    // Acquisition cost per unit — set automatically from the PO on delivery,
    // optional on manual receipt. Null = cost unknown (excluded from valuation).
    [Column(TypeName = "decimal(18,2)")]
    public decimal? UnitCost { get; set; }

    public bool IsExpired => ExpirationDate.HasValue && ExpirationDate.Value.Date < DateTime.UtcNow.Date;

    public int? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }
}
