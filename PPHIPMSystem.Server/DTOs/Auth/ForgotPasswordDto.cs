using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Auth;

public class ForgotPasswordDto
{
    // Username or email. Accounts that sign in by username — the Super Admin
    // in particular — must be able to recover without knowing which address
    // is on file.
    [Required, MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordWithTokenDto
{
    [Required, EmailAddress, MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(2048)]
    public string Token { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;
}
