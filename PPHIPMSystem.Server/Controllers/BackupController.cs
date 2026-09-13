using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Backup;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
public class BackupController : ControllerBase
{
    private const string ExcelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IBackupService _backups;
    private readonly IAuditLogService _audit;

    public BackupController(IBackupService backups, IAuditLogService audit)
    {
        _backups = backups;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _backups.GetAllAsync());

    [HttpPost("run")]
    public async Task<IActionResult> RunNow()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await _backups.CreateBackupAsync(BackupType.Manual, userId);
        await _audit.LogAsync(userId, "BackupCreated", "Backup", null, $"Manual backup: {result.FileName} ({result.Status})");

        if (result.Status == BackupStatus.Failed)
            return StatusCode(500, new { message = result.ErrorMessage ?? "Backup failed.", backup = result });
        return Ok(result);
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id, [FromQuery] string format = "xlsx")
    {
        var file = await _backups.GetFileAsync(id, format);
        if (file is null) return NotFound(new { message = "Backup file not found." });
        var contentType = format == "bak" ? "application/octet-stream" : ExcelContentType;
        return File(file.Value.Content, contentType, file.Value.FileName);
    }

    [HttpPost("{id:int}/verify")]
    public async Task<IActionResult> Verify(int id)
    {
        var (ok, message) = await _backups.VerifyAsync(id);
        await _audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "BackupVerified", "Backup", id,
            $"{(ok ? "Passed" : "Failed")}: {message}");
        return ok ? Ok(new { message }) : BadRequest(new { message });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _backups.DeleteAsync(id);
        if (!ok) return NotFound();
        await _audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "BackupDeleted", "Backup", id);
        return NoContent();
    }

    [HttpGet("schedule")]
    public async Task<IActionResult> GetSchedule()
        => Ok(new BackupScheduleDto { Time = await _backups.GetScheduleTimeAsync() });

    [HttpPut("schedule")]
    public async Task<IActionResult> SetSchedule([FromBody] BackupScheduleDto dto)
    {
        await _backups.SetScheduleTimeAsync(dto.Time);
        await _audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "BackupScheduleUpdated", "SystemSetting", null, $"Backup time set to {dto.Time}");
        return Ok(dto);
    }
}
