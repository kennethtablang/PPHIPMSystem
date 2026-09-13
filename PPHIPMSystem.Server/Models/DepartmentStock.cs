using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

// Running balance of an item held by a department (ward/unit). Increased by
// issuances to the department, decreased by returns to central stock.
// One row per (department, item) — enforced by a unique index.
public class DepartmentStock
{
    public int Id { get; set; }

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public int InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
