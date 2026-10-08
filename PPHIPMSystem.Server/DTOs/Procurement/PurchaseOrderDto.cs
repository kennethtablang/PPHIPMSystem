using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Procurement;

// Optional batch details captured when confirming a delivery — one line per
// PO item the receiver wants to record a lot number / expiry for.
public class ConfirmDeliveryDto
{
    public List<DeliveryLineDto> Lines { get; set; } = [];

    // When the shipment actually arrived; defaults to today. May be in the
    // past (receipts are often keyed in later) but never in the future.
    public DateOnly? DeliveredOn { get; set; }

    // Supplier's delivery receipt / invoice number.
    [MaxLength(100)]
    public string? ReferenceNo { get; set; }

    // The shipment arrived later than agreed — applies to every line in it.
    public bool Delayed { get; set; }
}

public class DeliveryLineDto
{
    [Range(1, int.MaxValue)]
    public int PurchaseOrderItemId { get; set; }

    // Quantity received in this shipment; null = everything still outstanding.
    // 0 skips the line (allows partial deliveries across multiple confirmations).
    [Range(0, 1_000_000_000)]
    public decimal? QuantityReceived { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    public DateTime? ExpirationDate { get; set; }

    // Problems with this line: Damaged / Substandard (with the refused units
    // in QuantityRejected) or Incomplete. Delayed is set shipment-wide above.
    public List<DeliveryIssue>? Issues { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal QuantityRejected { get; set; }

    [MaxLength(500)]
    public string? IssueRemarks { get; set; }
}

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public string PONumber { get; set; } = string.Empty;
    public int ProcurementRequestId { get; set; }
    public string RequestNumber { get; set; } = string.Empty;
    public string GeneratedByFullName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public bool IsDelivered { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime GeneratedAt { get; set; }
    public IEnumerable<PurchaseOrderItemDto> Items { get; set; } = [];
}

public class PurchaseOrderItemDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal QuantityOrdered { get; set; }
    public decimal? QuantityDelivered { get; set; }
    public decimal QuantityOutstanding => Math.Max(QuantityOrdered - (QuantityDelivered ?? 0), 0);
    public bool IsFullyDelivered => QuantityOutstanding == 0;
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public IEnumerable<PurchaseOrderDeliveryDto> Deliveries { get; set; } = [];
}

public class PurchaseOrderDeliveryDto
{
    public int Id { get; set; }
    public decimal Quantity { get; set; }
    public DateOnly DeliveredOn { get; set; }
    public string? ReferenceNo { get; set; }
    public string? ReceivedByFullName { get; set; }
    public string? LotNumber { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public List<string> Issues { get; set; } = [];
    public decimal QuantityRejected { get; set; }
    public string? IssueRemarks { get; set; }
}
