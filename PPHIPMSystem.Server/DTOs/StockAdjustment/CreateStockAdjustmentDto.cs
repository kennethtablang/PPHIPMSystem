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

// Cycle count: many counted quantities at once. Lines matching the recorded
// quantity are skipped; the rest become pending adjustments for approval.
public class CycleCountDto
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public List<CycleCountLineDto> Lines { get; set; } = [];
}

public class CycleCountLineDto
{
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal PhysicalCount { get; set; }
}

public class CycleCountResultDto
{
    public int AdjustmentsCreated { get; set; }
    public int UnchangedItems { get; set; }
}
