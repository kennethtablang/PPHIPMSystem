using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.System;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingsService _settings;
    private readonly IAuditLogService _audit;

    public SystemSettingsController(ISystemSettingsService settings, IAuditLogService audit)
    {
        _settings = settings;
        _audit = audit;
    }

    // Readable by any authenticated user (e.g. topbar needs the organization name).
    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _settings.GetAsync());

    // Anonymous: the reset-password page needs the policy before login.
    [HttpGet("password-policy")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPasswordPolicy() => Ok(await _settings.GetPasswordPolicyAsync());

    [HttpPut]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Update([FromBody] SystemSettingsDto dto)
    {
        var result = await _settings.UpdateAsync(dto);
        await _audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "SystemSettingsUpdated", "SystemSetting", null,
            $"Org: {dto.OrganizationName}, Backup: {dto.BackupTime}, Retention: {dto.BackupRetentionDays}d, " +
            $"ItemDefaults: {dto.DefaultExpirationWarningDays}d/{dto.DefaultReorderThreshold}, " +
            $"PwPolicy: {dto.PasswordMinLength}+{(dto.PasswordRequireSpecial ? "special" : "no-special")}, " +
            $"Announcement: {(string.IsNullOrWhiteSpace(dto.AnnouncementMessage) ? "none" : "set")}");
        return Ok(result);
    }
}
