using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.StockMovement;

public class StockMovementDto
{
    public int Id { get; set; }
    public int InventoryItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public StockMovementType MovementType { get; set; }
    public string MovementTypeName => MovementType.ToString();
    public decimal Quantity { get; set; }
    public decimal QuantityBeforeMovement { get; set; }
    public decimal QuantityAfterMovement { get; set; }
    public string? Remarks { get; set; }
    public string PerformedByUserId { get; set; } = string.Empty;
    public string PerformedByFullName { get; set; } = string.Empty;
    public int? PurchaseOrderId { get; set; }
    public string? PONumber { get; set; }
    public DateTime MovementDate { get; set; }
}
