using PPHIPMSystem.Server.DTOs.Auth;

namespace PPHIPMSystem.Server.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto, string? ipAddress);
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordDto dto);
    Task<bool> ResetPasswordAsync(string userId, string newPassword);
}
