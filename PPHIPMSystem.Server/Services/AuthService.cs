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
    private readonly IEmailService _email;

    public AuthService(UserManager<ApplicationUser> userManager, IConfiguration config, ApplicationDbContext db, IAuditLogService audit, IEmailService email)
    {
        _userManager = userManager;
        _config = config;
        _db = db;
        _audit = audit;
        _email = email;
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

        if (user.TwoFactorEnabled)
        {
            var code = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");
            
            string emailBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>
                    <h2 style='color: #1a6a36;'>PPH IPMS - 2-Step Verification</h2>
                    <p>Your one-time passcode for login is:</p>
                    <h1 style='font-size: 32px; letter-spacing: 5px; color: #333;'>{code}</h1>
                    <p>This code will expire shortly. Do not share it with anyone.</p>
                </div>
            ";
            
            await _email.SendEmailAsync(user.Email!, "Your Login Verification Code", emailBody);
            
            return new LoginResponseDto
            {
                RequiresTwoFactor = true,
                Username = user.UserName!
            };
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
            DepartmentName = user.Department?.Name,
            DepartmentId = user.DepartmentId
        };
    }

    public async Task<LoginResponseDto?> Login2FaAsync(Login2FaDto dto, string? ipAddress)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.UserName == dto.Username && u.IsActive);

        if (user is null) return null;

        var validCode = await _userManager.VerifyTwoFactorTokenAsync(user, "Email", dto.Code);
        if (!validCode)
        {
            await _audit.LogAsync(user.Id, "LoginFailed", "Auth", null, "Invalid 2FA code", ipAddress);
            return null;
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(user.Id, "Login", "Auth", null, "2FA verified", ipAddress);

        var token = GenerateToken(user);
        return new LoginResponseDto
        {
            Token = token.token,
            Expiry = token.expiry,
            UserId = user.Id,
            Username = user.UserName!,
            FullName = $"{user.FirstName} {user.LastName}",
            Role = user.Role.ToString(),
            DepartmentName = user.Department?.Name,
            DepartmentId = user.DepartmentId
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

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || !user.IsActive) return false;

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        
        // Use the React client URL
        var clientUrl = _config["ClientUrl"] ?? "http://localhost:5173";
        var encodedToken = Uri.EscapeDataString(token);
        var encodedEmail = Uri.EscapeDataString(email);
        var resetLink = $"{clientUrl}/reset-password?token={encodedToken}&email={encodedEmail}";

        var body = $@"
            <h2>Password Reset Request</h2>
            <p>Hi {user.FirstName},</p>
            <p>You requested a password reset for your PPH IPMS account. Click the link below to set a new password:</p>
            <p><a href='{resetLink}'>{resetLink}</a></p>
            <p>If you did not request this, please ignore this email.</p>
        ";

        await _email.SendEmailAsync(user.Email!, "PPH IPMS - Password Reset", body, true);
        await _audit.LogAsync(user.Id, "ForgotPasswordRequested", "User", null);
        
        return true;
    }

    public async Task<bool> ResetPasswordWithTokenAsync(ResetPasswordWithTokenDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null) return false;

        var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
        if (result.Succeeded)
        {
            await _audit.LogAsync(user.Id, "PasswordResetWithToken", "User", null);
        }
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
