using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Budget;

// A department's appropriation for a fiscal year plus the spend derived from
// purchase orders. Every department is returned whether or not a budget row
// exists (HasBudget says which) so the admin page can list them all.
public class DepartmentBudgetDto
{
    // Null when no budget has been set for this department/year yet.
    public int? Id { get; set; }
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int FiscalYear { get; set; }

    public bool HasBudget { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }

    // Committed: purchase orders raised this fiscal year against this
    // department's requests — money already promised to a supplier.
    public decimal Committed { get; set; }

    // Pending: requests approved (or still in the approval chain) with no PO
    // yet, valued at their estimated unit costs. Informational only — it never
    // blocks anything, because estimates are not commitments.
    public decimal Pending { get; set; }

    public decimal Remaining => Amount - Committed;
    public decimal UtilizationPercent => Amount <= 0 ? 0 : Math.Round(Committed / Amount * 100, 1);

    public int PurchaseOrderCount { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class UpsertDepartmentBudgetDto
{
    [Range(1, int.MaxValue)]
    public int DepartmentId { get; set; }

    [Range(2000, 2200)]
    public int FiscalYear { get; set; }

    [Range(0, 100_000_000_000)]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

// Answer to "can this department afford this amount right now?" — used by the
// PO generation guard and shown in the approval screens before anyone commits.
public class BudgetCheckDto
{
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int FiscalYear { get; set; }

    // No budget row = the department is unbudgeted and nothing is enforced.
    public bool HasBudget { get; set; }
    public decimal Amount { get; set; }
    public decimal Committed { get; set; }
    public decimal Remaining => Amount - Committed;

    // The amount being weighed (a PO total, or a request's estimated value).
    public decimal ProposedAmount { get; set; }
    public decimal RemainingAfter => Remaining - ProposedAmount;
    public bool WouldExceed => HasBudget && ProposedAmount > Remaining;

    // Whether exceeding actually blocks the transaction (System setting).
    public bool Enforced { get; set; }
    public bool WouldBlock => WouldExceed && Enforced;
}
