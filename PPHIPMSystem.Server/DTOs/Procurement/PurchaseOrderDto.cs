using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Procurement;

// Optional batch details captured when confirming a delivery — one line per
// PO item the receiver wants to record a lot number / expiry for.
public class ConfirmDeliveryDto
{
    public List<DeliveryLineDto> Lines { get; set; } = [];
}

public class DeliveryLineDto
{
    [Range(1, int.MaxValue)]
    public int PurchaseOrderItemId { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    public DateTime? ExpirationDate { get; set; }
}

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public string PONumber { get; set; } = string.Empty;
    public int ProcurementRequestId { get; set; }
    public string RequestNumber { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
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
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
}
