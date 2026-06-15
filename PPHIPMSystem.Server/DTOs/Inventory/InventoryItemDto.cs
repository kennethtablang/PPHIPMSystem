using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Inventory;

public class InventoryItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? Description { get; set; }
    public string Unit { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal QuantityOnHand { get; set; }
    public decimal ReorderThreshold { get; set; }
    public bool IsBelowReorder => QuantityOnHand <= ReorderThreshold;
    public int ExpirationWarningDays { get; set; }
    public ForecastMethod PreferredForecastMethod { get; set; }
    public int MovingAverageWindow { get; set; }
    public decimal SmoothingConstant { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int ExpiringBatchCount { get; set; }
}
