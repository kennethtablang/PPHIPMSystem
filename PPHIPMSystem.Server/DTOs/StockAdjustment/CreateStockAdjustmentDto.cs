using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.StockAdjustment;

public class CreateStockAdjustmentDto
{
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal PhysicalCount { get; set; }

    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public class ApproveAdjustmentDto
{
    [Required]
    public bool Approved { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
