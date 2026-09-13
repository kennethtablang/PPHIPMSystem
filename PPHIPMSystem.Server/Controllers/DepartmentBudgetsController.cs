using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Budget;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

// Department appropriations per fiscal year. Administrators set the figures;
// everyone else reads them, with department heads scoped to their own ward
// (same rule as procurement requests and department stock).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentBudgetsController : ControllerBase
{
    private readonly IDepartmentBudgetService _budgets;

    public DepartmentBudgetsController(IDepartmentBudgetService budgets) => _budgets = budgets;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? year, [FromQuery] int? departmentId)
    {
        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var ownDeptId)) return Forbid();
            departmentId = ownDeptId;
        }

        var fiscalYear = year ?? DateTime.UtcNow.Year;
        if (fiscalYear is < 2000 or > 2200)
            return BadRequest(new { message = "Fiscal year is out of range." });

        return Ok(await _budgets.GetAllAsync(fiscalYear, departmentId));
    }

    // What a request would cost against its department's remaining budget —
    // shown to approvers before they push it further up the chain.
    [HttpGet("check/{requestId}")]
    public async Task<IActionResult> CheckRequest(int requestId)
    {
        var result = await _budgets.CheckRequestAsync(requestId);
        if (result is null) return NotFound();

        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var ownDeptId) || result.DepartmentId != ownDeptId)
                return Forbid();
        }

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Upsert([FromBody] UpsertDepartmentBudgetDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            return Ok(await _budgets.UpsertAsync(dto, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _budgets.DeleteAsync(id, userId);
        return ok ? NoContent() : NotFound();
    }
}
