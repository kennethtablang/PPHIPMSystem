using Microsoft.AspNetCore.Identity;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Set when the account starts with a password someone else knows
    // (seeded accounts, admin-created users, admin resets); the client forces
    // a password change before entering the app, and ChangePassword clears it.
    public bool MustChangePassword { get; set; }

    // Email notification preferences (master + per-category).
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool EmailNotifyInventory { get; set; } = true;      // low stock, expiry
    public bool EmailNotifyProcurement { get; set; } = true;    // requests, approvals, POs
    public bool EmailNotifyAdjustments { get; set; } = true;    // stock adjustments

    public ICollection<ProcurementRequest> ProcurementRequests { get; set; } = [];
    public ICollection<ProcurementApproval> ProcurementApprovals { get; set; } = [];
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockAdjustment> StockAdjustments { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}
