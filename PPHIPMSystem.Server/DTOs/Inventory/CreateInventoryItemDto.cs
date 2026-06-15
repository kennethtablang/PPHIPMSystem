using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Inventory;

public class CreateInventoryItemDto
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
    public decimal ReorderThreshold { get; set; } = 0;

    [Range(1, 365)]
    public int ExpirationWarningDays { get; set; } = 30;

    public ForecastMethod PreferredForecastMethod { get; set; } = ForecastMethod.MovingAverage;

    [Range(1, 24)]
    public int MovingAverageWindow { get; set; } = 3;

    [Range(0.01, 0.99)]
    public decimal SmoothingConstant { get; set; } = 0.3m;
}
