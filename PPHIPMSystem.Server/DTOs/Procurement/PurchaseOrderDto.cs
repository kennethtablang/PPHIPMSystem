namespace PPHIPMSystem.Server.DTOs.Procurement;

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
