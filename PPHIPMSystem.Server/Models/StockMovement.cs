using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class StockMovement
{
    public int Id { get; set; }

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public StockMovementType MovementType { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityBeforeMovement { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityAfterMovement { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public string PerformedByUserId { get; set; } = string.Empty;
    public ApplicationUser PerformedByUser { get; set; } = null!;

    public int? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public DateTime MovementDate { get; set; } = DateTime.UtcNow;
}
