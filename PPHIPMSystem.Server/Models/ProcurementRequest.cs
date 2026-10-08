using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class ProcurementRequest
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string RequestNumber { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public string RequestedByUserId { get; set; } = string.Empty;
    public ApplicationUser RequestedByUser { get; set; } = null!;

    // Name of the person actually asking, as typed on the request form. On a
    // shared department PC the logged-in account is the ward's, not a person's,
    // so this is the only record of who needed the supplies.
    [MaxLength(150)]
    public string? RequestedByName { get; set; }

    [Required, MaxLength(1000)]
    public string Justification { get; set; } = string.Empty;

    // Purchase Request form (Appendix 47) fields. Usually assigned by the
    // Provincial budget/treasury offices, so all optional — the printed form
    // leaves a blank line when they are not known yet.
    [MaxLength(100)]
    public string? Fund { get; set; }

    [MaxLength(150)]
    public string? Section { get; set; }

    [MaxLength(100)]
    public string? Fpp { get; set; }

    // Urgent / emergency request: shown first in every review queue and
    // flagged in notifications. The reason is mandatory so whoever approves
    // can judge whether the priority is justified.
    public bool IsUrgent { get; set; }

    [MaxLength(1000)]
    public string? UrgentReason { get; set; }

    public ProcurementStatus Status { get; set; } = ProcurementStatus.Draft;

    // Existing rows default to DepartmentSupply (0) — every request before
    // replenishment PRs existed was a department request.
    public RequestType Type { get; set; } = RequestType.DepartmentSupply;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    // Last time the request was sent for review (re-set on resubmission
    // after a return), for the status timeline.
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }

    public ICollection<ProcurementRequestItem> Items { get; set; } = [];
    public ICollection<ProcurementApproval> Approvals { get; set; } = [];
    public PurchaseOrder? PurchaseOrder { get; set; }
}
