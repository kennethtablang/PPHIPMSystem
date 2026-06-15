using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.StockAdjustment;

public class StockAdjustmentDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public decimal RecordedQuantity { get; set; }
    public decimal PhysicalCount { get; set; }
    public decimal Variance { get; set; }
    public string Reason { get; set; } = string.Empty;
    public AdjustmentStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string RequestedByUserId { get; set; } = string.Empty;
    public string RequestedByFullName { get; set; } = string.Empty;
    public string? ApprovedByUserId { get; set; }
    public string? ApprovedByFullName { get; set; }
    public string? ApproverRemarks { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
}
