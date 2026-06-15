using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

public class ProcurementRequestItem
{
    public int Id { get; set; }

    public int ProcurementRequestId { get; set; }
    public ProcurementRequest ProcurementRequest { get; set; } = null!;

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal QuantityRequested { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? EstimatedUnitCost { get; set; }

    [MaxLength(300)]
    public string? Remarks { get; set; }
}
