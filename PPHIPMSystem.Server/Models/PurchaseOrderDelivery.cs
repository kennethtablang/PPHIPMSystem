using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

// One shipment's worth of one PO line. Suppliers deliver in instalments
// ("37 = 8/18/26, 3 = 8/10/26"), so a line collects several of these until
// their total reaches the quantity ordered.
public class PurchaseOrderDelivery
{
    public int Id { get; set; }

    public int PurchaseOrderItemId { get; set; }
    public PurchaseOrderItem PurchaseOrderItem { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }

    // When the goods actually arrived — often earlier than the day the
    // receipt is keyed in.
    [Column(TypeName = "date")]
    public DateTime DeliveredOn { get; set; }

    // Supplier's delivery receipt / invoice number.
    [MaxLength(100)]
    public string? ReferenceNo { get; set; }

    public string? ReceivedByUserId { get; set; }
    public ApplicationUser? ReceivedByUser { get; set; }

    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // The batch this shipment became (lot / expiry live there).
    public int? ItemBatchId { get; set; }
    public ItemBatch? ItemBatch { get; set; }
}
