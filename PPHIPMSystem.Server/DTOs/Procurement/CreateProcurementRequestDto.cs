using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Procurement;

public class CreateProcurementRequestDto
{
    // Requesting department. Honoured for administrators only — department
    // accounts are always pinned to their own department by the controller.
    [Range(1, int.MaxValue)]
    public int? DepartmentId { get; set; }

    [MaxLength(150)]
    public string? RequestedByName { get; set; }

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

// Edits a request that nobody has approved yet — same shape as a new one.
public class UpdateProcurementRequestDto : CreateProcurementRequestDto;

public class CancelProcurementRequestDto
{
    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class ApproveProcurementDto
{
    [Required]
    public string Action { get; set; } = string.Empty; // "Approve", "Reject", "Return"

    [MaxLength(1000)]
    public string? Remarks { get; set; }

    // Inventory review only: the quantity each line is allocated. Lines left
    // out keep any saved allocation, else get the full requested quantity.
    public List<LineAllocationDto>? Allocations { get; set; }
}

public class LineAllocationDto
{
    [Range(1, int.MaxValue)]
    public int ProcurementRequestItemId { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal QuantityApproved { get; set; }
}

public class SaveAllocationsDto
{
    [Required, MinLength(1)]
    public List<LineAllocationDto> Lines { get; set; } = [];
}

public class GeneratePurchaseOrderDto
{
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
