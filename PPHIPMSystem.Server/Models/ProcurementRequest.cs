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

    public ProcurementStatus Status { get; set; } = ProcurementStatus.Draft;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReleasedAt { get; set; }

    public ICollection<ProcurementRequestItem> Items { get; set; } = [];
    public ICollection<ProcurementApproval> Approvals { get; set; } = [];
    public PurchaseOrder? PurchaseOrder { get; set; }
}
