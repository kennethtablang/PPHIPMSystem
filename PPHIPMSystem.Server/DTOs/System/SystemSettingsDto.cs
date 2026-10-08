using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.System;

public class SystemSettingsDto
{
    [Required, MaxLength(150)]
    public string OrganizationName { get; set; } = string.Empty;

    // Daily backup time, "HH:mm" 24-hour (shared with the backup scheduler).
    [Required, RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Time must be in HH:mm 24-hour format.")]
    public string BackupTime { get; set; } = "00:00";

    [Range(1, 365)]
    public int BackupRetentionDays { get; set; } = 30;

    // Defaults applied when creating new inventory items (prefill only; each item stays editable).
    [Range(1, 365)]
    public int DefaultExpirationWarningDays { get; set; } = 30;

    [Range(0, 1_000_000)]
    public int DefaultReorderThreshold { get; set; } = 0;

    // Shown as a dismissible banner to all users; empty = no banner.
    [MaxLength(300)]
    public string AnnouncementMessage { get; set; } = string.Empty;

    // Optional display window; null bounds mean "immediately" / "until cleared".
    public DateTime? AnnouncementStartsAt { get; set; }
    public DateTime? AnnouncementEndsAt { get; set; }

    // Password policy enforced by SystemPasswordValidator (8 is the hard floor).
    [Range(8, 64)]
    public int PasswordMinLength { get; set; } = 8;

    public bool PasswordRequireSpecial { get; set; } = true;

    // Data retention (0 = keep forever), applied nightly by MaintenanceSchedulerService.
    [Range(0, 3650)]
    public int NotificationRetentionDays { get; set; } = 90;

    [Range(0, 3650)]
    public int AuditLogRetentionDays { get; set; } = 0;

    // Email the monthly consumption/procurement summary to administrators.
    public bool MonthlyReportEmails { get; set; } = false;

    // Purchase Request form (Appendix 47) header and signatories. Names may be
    // left empty — the form then prints a blank line to sign over.
    [MaxLength(150)]
    public string PrLgu { get; set; } = string.Empty;

    [MaxLength(100)]
    public string PrDepartment { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PrRequestedByName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PrRequestedByDesignation { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PrCashAvailabilityName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PrCashAvailabilityDesignation { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PrApproverName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PrApproverDesignation { get; set; } = string.Empty;

    // Letterhead printed on hospital forms (under the organization name), and
    // the Requisition and Issue Slip's approvers and document control code.
    [MaxLength(200)]
    public string LetterheadAddress { get; set; } = string.Empty;

    [MaxLength(150)]
    public string LetterheadCertification { get; set; } = string.Empty;

    [MaxLength(150)]
    public string RisApprover1Name { get; set; } = string.Empty;

    [MaxLength(150)]
    public string RisApprover1Designation { get; set; } = string.Empty;

    [MaxLength(150)]
    public string RisApprover2Name { get; set; } = string.Empty;

    [MaxLength(150)]
    public string RisApprover2Designation { get; set; } = string.Empty;

    [MaxLength(50)]
    public string RisFormCode { get; set; } = string.Empty;

    [MaxLength(20)]
    public string RisRevisionNo { get; set; } = string.Empty;

    [MaxLength(20)]
    public string RisRevisionDate { get; set; } = string.Empty;
}
