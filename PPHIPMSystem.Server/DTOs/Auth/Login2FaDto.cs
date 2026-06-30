using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Auth;

public class Login2FaDto
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Code { get; set; } = string.Empty;
}
