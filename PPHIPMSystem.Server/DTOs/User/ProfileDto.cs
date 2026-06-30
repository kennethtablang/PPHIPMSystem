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
}

public class UpdateProfileDto
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public bool TwoFactorEnabled { get; set; }
}
