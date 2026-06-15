using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _auth.LoginAsync(dto, ip);
        if (result is null) return Unauthorized(new { message = "Invalid credentials or account inactive." });
        return Ok(result);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _auth.ChangePasswordAsync(userId, dto);
        return ok ? Ok(new { message = "Password changed." }) : BadRequest(new { message = "Current password is incorrect." });
    }

    [Authorize(Roles = "HospitalAdministrator")]
    [HttpPost("reset-password/{userId}")]
    public async Task<IActionResult> ResetPassword(string userId, [FromBody] string newPassword)
    {
        var ok = await _auth.ResetPasswordAsync(userId, newPassword);
        return ok ? Ok(new { message = "Password reset." }) : NotFound();
    }
}
