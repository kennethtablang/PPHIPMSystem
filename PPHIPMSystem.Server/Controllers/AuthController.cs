using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PPHIPMSystem.Server.DTOs.Auth;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        try
        {
            var result = await _auth.LoginAsync(dto, ip);
            if (result is null) return Unauthorized(new { message = "Invalid credentials or inactive account." });
            if (result.RequiresTwoFactor) return Ok(result); // Return 200 OK so frontend knows it needs OTP
            return Ok(result);
        }
        catch (InvalidOperationException ex) // account lockout
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("login-2fa")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login2Fa(Login2FaDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        try
        {
            var result = await _auth.Login2FaAsync(dto, ip);
            if (result is null) return Unauthorized(new { message = "Invalid or expired verification code." });
            return Ok(result);
        }
        catch (InvalidOperationException ex) // account lockout
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequestDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _auth.RefreshAsync(dto.RefreshToken, ip);
        return result is null
            ? Unauthorized(new { message = "Session expired. Please sign in again." })
            : Ok(result);
    }

    // Called on sign-out so the refresh token can't be reused afterwards.
    [HttpPost("revoke")]
    public async Task<IActionResult> Revoke([FromBody] RefreshRequestDto dto)
    {
        await _auth.RevokeRefreshTokenAsync(dto.RefreshToken);
        return NoContent();
    }

    // ── Authenticator-app (TOTP) enrolment ──────────────────────────────────

    [Authorize]
    [HttpPost("authenticator/setup")]
    public async Task<IActionResult> AuthenticatorSetup()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _auth.BeginAuthenticatorSetupAsync(userId);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize]
    [HttpPost("authenticator/confirm")]
    public async Task<IActionResult> AuthenticatorConfirm([FromBody] AuthenticatorConfirmDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _auth.ConfirmAuthenticatorAsync(userId, dto.Code);
        return ok
            ? Ok(new { message = "Authenticator enabled." })
            : BadRequest(new { message = "That code didn't match — check the app and try again." });
    }

    [Authorize]
    [HttpPost("authenticator/remove")]
    public async Task<IActionResult> AuthenticatorRemove()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _auth.RemoveAuthenticatorAsync(userId);
        return ok ? Ok(new { message = "Authenticator removed." }) : NotFound();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _auth.ChangePasswordAsync(userId, dto);
        return ok ? Ok(new { message = "Password changed." }) : BadRequest(new { message = "Current password is incorrect." });
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth-email")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        // Always return OK to prevent email enumeration attacks
        await _auth.ForgotPasswordAsync(dto.Email);
        return Ok(new { message = "If the email is registered, a password reset link has been sent." });
    }

    [HttpPost("reset-password-token")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPasswordWithToken([FromBody] ResetPasswordWithTokenDto dto)
    {
        var ok = await _auth.ResetPasswordWithTokenAsync(dto);
        return ok ? Ok(new { message = "Password has been successfully reset." }) : BadRequest(new { message = "Invalid token or email." });
    }
}
