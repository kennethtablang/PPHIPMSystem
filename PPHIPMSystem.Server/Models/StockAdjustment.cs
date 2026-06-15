using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class StockAdjustment
{
    public int Id { get; set; }

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal RecordedQuantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal PhysicalCount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Variance => PhysicalCount - RecordedQuantity;

    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    public AdjustmentStatus Status { get; set; } = AdjustmentStatus.Pending;

    public string RequestedByUserId { get; set; } = string.Empty;
    public ApplicationUser RequestedByUser { get; set; } = null!;

    public string? ApprovedByUserId { get; set; }
    public ApplicationUser? ApprovedByUser { get; set; }

    [MaxLength(500)]
    public string? ApproverRemarks { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
}
