using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.StockMovement;

public class CreateStockMovementDto
{
    [Required]
    public int InventoryItemId { get; set; }

    [Required]
    public StockMovementType MovementType { get; set; }

    [Required, Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public int? PurchaseOrderId { get; set; }
}
