using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.StockMovement;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

// Department stock ledger. Department heads are locked to their own department
// (same scoping as procurement); other roles see any.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentStockController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IStockMovementService _movements;

    public DepartmentStockController(ApplicationDbContext db, IStockMovementService movements)
    {
        _db = db;
        _movements = movements;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? departmentId)
    {
        if (User.IsInRole("DepartmentHead") || User.IsInRole("DepartmentStaff"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var ownDeptId)) return Forbid();
            departmentId = ownDeptId;
        }

        var query = _db.DepartmentStocks.AsNoTracking()
            .Include(d => d.Department)
            .Include(d => d.InventoryItem)
            .Where(d => d.Quantity > 0);
        if (departmentId.HasValue)
            query = query.Where(d => d.DepartmentId == departmentId.Value);

        var rows = await query
            .OrderBy(d => d.Department.Name).ThenBy(d => d.InventoryItem.Name)
            .Select(d => new
            {
                d.Id,
                d.DepartmentId,
                DepartmentName = d.Department.Name,
                d.InventoryItemId,
                ItemName = d.InventoryItem.Name,
                ItemCode = d.InventoryItem.ItemCode,
                d.InventoryItem.Unit,
                d.Quantity,
                d.UpdatedAt,
            })
            .ToListAsync();

        return Ok(rows);
    }

    // Ward-level consumption. Kept off StockMovementsController on purpose:
    // department heads are allowed here, and must not gain access to receipts,
    // issuances, or disposals by being added to that endpoint's role list.
    [HttpPost("consume")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer,DepartmentHead")]
    public async Task<IActionResult> Consume([FromBody] RecordDepartmentConsumptionDto dto)
    {
        // A department head can only ever draw down their own ward, whatever the
        // request body claims.
        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var ownDeptId))
                return Forbid();
            if (dto.DepartmentId != ownDeptId)
                return Forbid();
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _movements.RecordDepartmentConsumptionAsync(dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Ward-to-ward handover (phase 3). Same role list as Consume for the same
    // reason: department heads belong here but must not reach the central
    // receipts/issuances/disposals endpoint.
    [HttpPost("transfer")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer,DepartmentHead")]
    public async Task<IActionResult> Transfer([FromBody] TransferDepartmentStockDto dto)
    {
        // A department head can only ever give stock away from their own ward.
        // Receiving is unrestricted — the sending ward is the one losing stock.
        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var ownDeptId))
                return Forbid();
            if (dto.FromDepartmentId != ownDeptId)
                return Forbid();
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _movements.TransferBetweenDepartmentsAsync(dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
