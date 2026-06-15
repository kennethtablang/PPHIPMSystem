using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.StockAdjustment;

public class CreateStockAdjustmentDto
{
    [Required]
    public int InventoryItemId { get; set; }

    [Required, Range(0, double.MaxValue)]
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
