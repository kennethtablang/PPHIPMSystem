namespace PPHIPMSystem.Server.DTOs.Batch;

public class ItemBatchDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? LotNumber { get; set; }
    public decimal Quantity { get; set; }
    public decimal RemainingQuantity { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public bool IsExpired { get; set; }
    public int? DaysUntilExpiry { get; set; }
    public DateTime ReceivedDate { get; set; }
    public int? PurchaseOrderId { get; set; }
    public string? PONumber { get; set; }
}
