using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PPHIPMSystem.Server.Models.Enums;

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

    // Problems noted on receipt (late, short, damaged, substandard).
    public DeliveryIssue Issues { get; set; } = DeliveryIssue.None;

    // Units that arrived damaged or substandard and were refused. They never
    // enter stock and stay outstanding on the PO until the supplier replaces
    // them.
    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityRejected { get; set; }

    [MaxLength(500)]
    public string? IssueRemarks { get; set; }

    // The batch this shipment became (lot / expiry live there).
    public int? ItemBatchId { get; set; }
    public ItemBatch? ItemBatch { get; set; }
}
