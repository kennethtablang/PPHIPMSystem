namespace PPHIPMSystem.Server.DTOs.Auth;

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime Expiry { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public int? DepartmentId { get; set; }
    public bool RequiresTwoFactor { get; set; } = false;
}
