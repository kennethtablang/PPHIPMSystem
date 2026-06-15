using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "HospitalAdministrator")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _audit;

    public AuditLogsController(IAuditLogService audit) => _audit = audit;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? entityType,
        [FromQuery] string? userId)
        => Ok(await _audit.GetAllAsync(from, to, entityType, userId));
}
