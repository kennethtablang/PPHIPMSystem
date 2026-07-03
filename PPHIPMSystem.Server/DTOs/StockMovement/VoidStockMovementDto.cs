using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.StockMovement;

public class VoidStockMovementDto
{
    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
