using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Batch;

public class CreateItemBatchDto
{
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal Quantity { get; set; }

    public DateTime? ExpirationDate { get; set; }

    [Range(1, int.MaxValue)]
    public int? PurchaseOrderId { get; set; }
}
