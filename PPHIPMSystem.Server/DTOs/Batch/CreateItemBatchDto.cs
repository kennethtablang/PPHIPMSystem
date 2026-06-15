using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Batch;

public class CreateItemBatchDto
{
    [Required]
    public int InventoryItemId { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    [Required, Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }

    public DateTime? ExpirationDate { get; set; }

    public int? PurchaseOrderId { get; set; }
}
