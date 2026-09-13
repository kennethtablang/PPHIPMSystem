using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Auth;

public class LoginDto
{
    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}

public class RefreshRequestDto
{
    [Required, MaxLength(100)]
    public string RefreshToken { get; set; } = string.Empty;
}

public class AuthenticatorSetupDto
{
    public string SharedKey { get; set; } = string.Empty;   // manual-entry form
    public string OtpauthUri { get; set; } = string.Empty;  // rendered as a QR code
}

public class AuthenticatorConfirmDto
{
    [Required, MaxLength(10)]
    public string Code { get; set; } = string.Empty;
}
