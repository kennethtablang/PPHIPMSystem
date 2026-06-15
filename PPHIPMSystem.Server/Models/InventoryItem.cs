using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class InventoryItem
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ItemCode { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string Unit { get; set; } = string.Empty;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityOnHand { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal ReorderThreshold { get; set; } = 0;

    public int ExpirationWarningDays { get; set; } = 30;

    public ForecastMethod PreferredForecastMethod { get; set; } = ForecastMethod.MovingAverage;

    public int MovingAverageWindow { get; set; } = 3;

    [Column(TypeName = "decimal(5,4)")]
    public decimal SmoothingConstant { get; set; } = 0.3m;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ItemBatch> Batches { get; set; } = [];
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockAdjustment> StockAdjustments { get; set; } = [];
    public ICollection<ProcurementRequestItem> ProcurementRequestItems { get; set; } = [];
    public ICollection<DemandForecast> DemandForecasts { get; set; } = [];
    public ICollection<ConsumptionRecord> ConsumptionRecords { get; set; } = [];
}
