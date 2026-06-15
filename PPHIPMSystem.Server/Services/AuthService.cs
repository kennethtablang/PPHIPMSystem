using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Auth;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _audit;

    public AuthService(UserManager<ApplicationUser> userManager, IConfiguration config, ApplicationDbContext db, IAuditLogService audit)
    {
        _userManager = userManager;
        _config = config;
        _db = db;
        _audit = audit;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginDto dto, string? ipAddress)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.UserName == dto.Username && u.IsActive);

        if (user is null)
        {
            await _audit.LogAsync(null, "LoginFailed", "Auth", null, $"Username: {dto.Username}", ipAddress);
            return null;
        }

        var valid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!valid)
        {
            await _audit.LogAsync(user.Id, "LoginFailed", "Auth", null, "Invalid password", ipAddress);
            return null;
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(user.Id, "Login", "Auth", null, null, ipAddress);

        var token = GenerateToken(user);
        return new LoginResponseDto
        {
            Token = token.token,
            Expiry = token.expiry,
            UserId = user.Id,
            Username = user.UserName!,
            FullName = $"{user.FirstName} {user.LastName}",
            Role = user.Role.ToString(),
            DepartmentName = user.Department?.Name
        };
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;
        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (result.Succeeded) await _audit.LogAsync(userId, "PasswordChanged", "User", null);
        return result.Succeeded;
    }

    public async Task<bool> ResetPasswordAsync(string userId, string newPassword)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (result.Succeeded) await _audit.LogAsync(userId, "PasswordReset", "User", null);
        return result.Succeeded;
    }

    private (string token, DateTime expiry) GenerateToken(ApplicationUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var expiry = DateTime.UtcNow.AddHours(double.Parse(_config["Jwt:ExpiryHours"] ?? "8"));
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName!),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("departmentId", user.DepartmentId?.ToString() ?? ""),
            new Claim("fullName", $"{user.FirstName} {user.LastName}")
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expiry);
    }
}
