using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.StockMovement;

public class CreateStockMovementDto
{
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [Required]
    public StockMovementType MovementType { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal Quantity { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    // Destination (Issuance) / source (Return) department; optional.
    [Range(1, int.MaxValue)]
    public int? DepartmentId { get; set; }

    [Range(1, int.MaxValue)]
    public int? PurchaseOrderId { get; set; }
}

// Ward-level usage recorded against a department's own balance. Deliberately a
// separate DTO and endpoint from CreateStockMovementDto: department heads may
// record this, and must not be able to reach receipts/issuances/disposals.
public class RecordDepartmentConsumptionDto
{
    [Range(1, int.MaxValue)]
    public int DepartmentId { get; set; }

    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal Quantity { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}

// Ward-to-ward handover. Central stock never moves, so this is a pure
// department-ledger operation: source balance down, destination balance up.
public class TransferDepartmentStockDto
{
    [Range(1, int.MaxValue)]
    public int FromDepartmentId { get; set; }

    [Range(1, int.MaxValue)]
    public int ToDepartmentId { get; set; }

    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal Quantity { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
