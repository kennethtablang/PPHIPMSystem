using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Procurement;

public class CreateProcurementRequestDto
{
    [Required, MaxLength(1000)]
    public string Justification { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public List<CreateProcurementRequestItemDto> Items { get; set; } = [];
}

public class CreateProcurementRequestItemDto
{
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal QuantityRequested { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal? EstimatedUnitCost { get; set; }

    [MaxLength(300)]
    public string? Remarks { get; set; }
}

public class ApproveProcurementDto
{
    [Required]
    public string Action { get; set; } = string.Empty; // "Approve", "Reject", "Return"

    [MaxLength(1000)]
    public string? Remarks { get; set; }
}

public class GeneratePurchaseOrderDto
{
    [Range(1, int.MaxValue)]
    public int SupplierId { get; set; }

    [Required, MinLength(1)]
    public List<POItemCostDto> ItemCosts { get; set; } = [];
}

public class POItemCostDto
{
    [Range(1, int.MaxValue)]
    public int ProcurementRequestItemId { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal UnitCost { get; set; }
}
