using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Procurement;

public class ProcurementRequestDto
{
    public int Id { get; set; }
    public string RequestNumber { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string RequestedByUserId { get; set; } = string.Empty;
    public string RequestedByFullName { get; set; } = string.Empty;
    public string Justification { get; set; } = string.Empty;
    public ProcurementStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public DateTime RequestedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public IEnumerable<ProcurementRequestItemDto> Items { get; set; } = [];
    public IEnumerable<ProcurementApprovalDto> Approvals { get; set; } = [];
    public int? PurchaseOrderId { get; set; }
    public string? PONumber { get; set; }
}

public class ProcurementRequestItemDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal QuantityRequested { get; set; }
    public decimal? EstimatedUnitCost { get; set; }
    public string? Remarks { get; set; }
}

public class ProcurementApprovalDto
{
    public int Id { get; set; }
    public string ApproverFullName { get; set; } = string.Empty;
    public string ApproverRole { get; set; } = string.Empty;
    public int ApprovalLevel { get; set; }
    public string ActionName { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime ActedAt { get; set; }
}
