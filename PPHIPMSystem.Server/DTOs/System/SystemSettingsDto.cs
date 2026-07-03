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

    // Password policy enforced by SystemPasswordValidator (8 is the hard floor).
    [Range(8, 64)]
    public int PasswordMinLength { get; set; } = 8;

    public bool PasswordRequireSpecial { get; set; } = true;
}
