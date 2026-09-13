using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PPHIPMSystem.Server.Models;

// A department's procurement appropriation for one fiscal year (calendar year,
// matching the LGU annual budget cycle). Spend is not stored here — it is
// derived from the purchase orders raised against the department's requests, so
// the two can never drift apart. One row per (department, year).
public class DepartmentBudget
{
    public int Id { get; set; }

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public int FiscalYear { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
