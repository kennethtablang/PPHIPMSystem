using PPHIPMSystem.Server.DTOs.Auth;

namespace PPHIPMSystem.Server.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto, string? ipAddress);
    Task<LoginResponseDto?> Login2FaAsync(Login2FaDto dto, string? ipAddress);
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordDto dto);
    Task<bool> ResetPasswordAsync(string userId, string newPassword);
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordWithTokenAsync(ResetPasswordWithTokenDto dto);
}
