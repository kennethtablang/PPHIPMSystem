using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.User;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Require auth globally
public class UsersController : ControllerBase
{
    private readonly IUserService _users;
    private readonly IAuthService _auth;
    private readonly IAuditLogService _audit;
    private readonly UserManager<ApplicationUser> _userManager;

    // Roles that a HospitalAdministrator is NOT allowed to act on or hand out
    private static readonly HashSet<UserRole> _privilegedRoles = new() { UserRole.SuperAdmin, UserRole.HospitalAdministrator };

    public UsersController(IUserService users, IAuthService auth, IAuditLogService audit, UserManager<ApplicationUser> userManager)
    {
        _users = users;
        _auth = auth;
        _audit = audit;
        _userManager = userManager;
    }

    // SuperAdmin is granted HospitalAdministrator by SuperAdminClaimsTransformation,
    // so "is a real SuperAdmin" has to be checked explicitly.
    private bool CallerIsSuperAdmin => User.IsInRole("SuperAdmin");

    private string CallerId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId is null) return Unauthorized();
        var profile = await _users.GetProfileAsync(userId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId is null) return Unauthorized();
        try
        {
            var profile = await _users.UpdateProfileAsync(userId, dto);
            return profile is null ? NotFound() : Ok(profile);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
        => Ok(await _users.GetAllAsync(search));

    [HttpGet("{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> GetById(string id)
    {
        var result = await _users.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        if (!CallerIsSuperAdmin && _privilegedRoles.Contains(dto.Role))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only a Super Admin can create administrator accounts." });

        try
        {
            var result = await _users.CreateAsync(dto, CallerId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserDto dto)
    {
        var target = await _userManager.FindByIdAsync(id);
        if (target is null) return NotFound();

        if (!CallerIsSuperAdmin && (_privilegedRoles.Contains(target.Role) || _privilegedRoles.Contains(dto.Role)))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only a Super Admin can modify administrator accounts or grant administrator roles." });

        // An admin locking themselves out (or demoting themselves) leaves nobody to undo it.
        if (id == CallerId && (!dto.IsActive || dto.Role != target.Role))
            return BadRequest(new { message = "You cannot deactivate your own account or change your own role." });

        try
        {
            var result = await _users.UpdateAsync(id, dto, CallerId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/reset-password")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
    {
        var target = await _userManager.FindByIdAsync(id);
        if (target is null) return NotFound();

        // HospitalAdministrator may not reset SuperAdmin or peer HospitalAdministrator accounts
        if (!CallerIsSuperAdmin && _privilegedRoles.Contains(target.Role))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only a Super Admin can reset an administrator's password." });

        var ok = await _auth.ResetPasswordAsync(id, dto.NewPassword);
        if (!ok) return BadRequest(new { message = "Password reset failed. Make sure the password meets the password policy." });

        await _audit.LogAsync(CallerId, "ResetPassword", "User", null,
            $"Admin reset password for user: {target.UserName} (Role: {target.Role})");

        return Ok(new { message = "Password reset." });
    }

    [HttpPatch("{id}/deactivate")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var target = await _userManager.FindByIdAsync(id);
        if (target is null) return NotFound();
        if (id == CallerId)
            return BadRequest(new { message = "You cannot deactivate your own account." });
        if (!CallerIsSuperAdmin && _privilegedRoles.Contains(target.Role))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only a Super Admin can deactivate administrator accounts." });

        var ok = await _users.DeactivateAsync(id, CallerId);
        return ok ? NoContent() : NotFound();
    }

    // Hard delete is restricted to SuperAdmin: deactivation is the normal path,
    // and a deleted account takes its audit trail's display names with it.
    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(string id)
    {
        if (id == CallerId)
            return BadRequest(new { message = "You cannot delete your own account." });

        try
        {
            var ok = await _users.DeleteAsync(id, CallerId);
            return ok ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public record ResetPasswordDto([Required, MinLength(8), MaxLength(128)] string NewPassword);
