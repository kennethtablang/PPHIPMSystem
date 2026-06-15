using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class ProcurementApproval
{
    public int Id { get; set; }

    public int ProcurementRequestId { get; set; }
    public ProcurementRequest ProcurementRequest { get; set; } = null!;

    public string ApproverUserId { get; set; } = string.Empty;
    public ApplicationUser ApproverUser { get; set; } = null!;

    public UserRole ApproverRole { get; set; }
    public ApprovalAction Action { get; set; }
    public int ApprovalLevel { get; set; }

    [MaxLength(1000)]
    public string? Remarks { get; set; }

    public DateTime ActedAt { get; set; } = DateTime.UtcNow;
}
