using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class StockMovement
{
    public int Id { get; set; }

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public StockMovementType MovementType { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityBeforeMovement { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityAfterMovement { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public string PerformedByUserId { get; set; } = string.Empty;
    public ApplicationUser PerformedByUser { get; set; } = null!;

    public int? PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    // The batch this movement received or disposed, when it concerns exactly
    // one batch. Lets a void put stock back on (or take it off) that batch
    // instead of guessing via FEFO. Null for FEFO issuances and legacy rows.
    public int? ItemBatchId { get; set; }
    public ItemBatch? ItemBatch { get; set; }

    // Destination (Issuance) or source (Return, DepartmentConsumption,
    // DepartmentTransfer) department.
    // Null = external / unattributed — the pre-transfer behaviour.
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    // Receiving department of a DepartmentTransfer; null for every other type.
    // Paired with DepartmentId (the source) it records the whole handover in
    // one row instead of a synthetic return + issuance pair.
    public int? ToDepartmentId { get; set; }
    public Department? ToDepartment { get; set; }

    public DateTime MovementDate { get; set; } = DateTime.UtcNow;

    // Void tracking. A voided movement keeps its ledger row but is flagged and
    // neutralised by a compensating reversal movement (see ReversalOfMovementId).
    public bool IsVoided { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedByUserId { get; set; }
    public ApplicationUser? VoidedByUser { get; set; }

    [MaxLength(500)]
    public string? VoidReason { get; set; }

    // Set on the compensating entry created by a void; points at the movement
    // it reverses. Non-null identifies this row as a reversal, not a real movement.
    public int? ReversalOfMovementId { get; set; }
    public StockMovement? ReversalOfMovement { get; set; }
}
