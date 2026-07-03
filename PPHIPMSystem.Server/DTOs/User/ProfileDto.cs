using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.User;

public class ProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public bool TwoFactorEnabled { get; set; }

    public bool EmailNotificationsEnabled { get; set; }
    public bool EmailNotifyInventory { get; set; }
    public bool EmailNotifyProcurement { get; set; }
    public bool EmailNotifyAdjustments { get; set; }
}

public class UpdateProfileDto
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [EmailAddress, MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    public bool TwoFactorEnabled { get; set; }

    public bool EmailNotificationsEnabled { get; set; }
    public bool EmailNotifyInventory { get; set; }
    public bool EmailNotifyProcurement { get; set; }
    public bool EmailNotifyAdjustments { get; set; }
}
