using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Inventory;

public class UpdateInventoryItemDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ItemCode { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required, MaxLength(50)]
    public string Unit { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal ReorderThreshold { get; set; }

    [Range(1, 365)]
    public int ExpirationWarningDays { get; set; }

    public ForecastMethod PreferredForecastMethod { get; set; }

    [Range(1, 24)]
    public int MovingAverageWindow { get; set; }

    [Range(0.01, 0.99)]
    public decimal SmoothingConstant { get; set; }

    public bool IsActive { get; set; }
}
