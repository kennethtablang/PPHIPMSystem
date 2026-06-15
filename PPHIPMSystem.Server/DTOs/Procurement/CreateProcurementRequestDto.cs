using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Procurement;

public class CreateProcurementRequestDto
{
    [Required, MaxLength(1000)]
    public string Justification { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public IEnumerable<CreateProcurementRequestItemDto> Items { get; set; } = [];
}

public class CreateProcurementRequestItemDto
{
    [Required]
    public int InventoryItemId { get; set; }

    [Required, Range(0.01, double.MaxValue)]
    public decimal QuantityRequested { get; set; }

    [Range(0, double.MaxValue)]
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
    [Required]
    public int SupplierId { get; set; }

    [Required]
    public IEnumerable<POItemCostDto> ItemCosts { get; set; } = [];
}

public class POItemCostDto
{
    [Required]
    public int ProcurementRequestItemId { get; set; }

    [Required, Range(0, double.MaxValue)]
    public decimal UnitCost { get; set; }
}
