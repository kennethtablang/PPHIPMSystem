using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.User;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;
    private readonly IAuthService _auth;
    private readonly IAuditLogService _audit;
    private readonly UserManager<ApplicationUser> _userManager;

    // Roles that a HospitalAdministrator is NOT allowed to act on
    private static readonly HashSet<string> _privilegedRoles = new() { "SuperAdmin", "HospitalAdministrator" };

    public UsersController(IUserService users, IAuthService auth, IAuditLogService audit, UserManager<ApplicationUser> userManager)
    {
        _users = users;
        _auth = auth;
        _audit = audit;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
        => Ok(await _users.GetAllAsync(search));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var result = await _users.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        try
        {
            var result = await _users.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserDto dto)
    {
        var result = await _users.UpdateAsync(id, dto);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
    {
        var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var callerRole = User.FindFirstValue(ClaimTypes.Role) ?? "";

        var target = await _userManager.FindByIdAsync(id);
        if (target is null) return NotFound();

        // HospitalAdministrator may not reset SuperAdmin or peer HospitalAdministrator accounts
        if (callerRole != "SuperAdmin" && _privilegedRoles.Contains(target.Role))
            return Forbid();

        var ok = await _auth.ResetPasswordAsync(id, dto.NewPassword);
        if (!ok) return StatusCode(500, new { message = "Password reset failed." });

        await _audit.LogAsync(callerId, "ResetPassword", "User", null,
            $"Admin reset password for user: {target.UserName} (Role: {target.Role})");

        return Ok(new { message = "Password reset." });
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var ok = await _users.DeactivateAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var ok = await _users.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}

public record ResetPasswordDto(string NewPassword);
