using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

public class PurchaseOrder
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string PONumber { get; set; } = string.Empty;

    public int ProcurementRequestId { get; set; }
    public ProcurementRequest ProcurementRequest { get; set; } = null!;

    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public string GeneratedByUserId { get; set; } = string.Empty;
    public ApplicationUser GeneratedByUser { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    public bool IsDelivered { get; set; } = false;
    public DateTime? DeliveredAt { get; set; }

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PurchaseOrderItem> Items { get; set; } = [];
    public ICollection<ItemBatch> ReceivedBatches { get; set; } = [];
    public ICollection<StockMovement> StockMovements { get; set; } = [];
}
