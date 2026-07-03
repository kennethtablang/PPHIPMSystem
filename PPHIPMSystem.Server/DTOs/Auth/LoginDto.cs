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
