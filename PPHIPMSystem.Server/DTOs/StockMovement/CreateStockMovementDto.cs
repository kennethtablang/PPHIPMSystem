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

    [Range(1, int.MaxValue)]
    public int? PurchaseOrderId { get; set; }
}
