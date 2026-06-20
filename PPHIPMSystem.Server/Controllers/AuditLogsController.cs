using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _audit;

    public AuditLogsController(IAuditLogService audit) => _audit = audit;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? action,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
        => Ok(await _audit.GetAllAsync(search, action, startDate, endDate));
}
