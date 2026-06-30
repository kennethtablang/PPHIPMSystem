using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProcurementController : ControllerBase
{
    private readonly IProcurementService _procurement;

    public ProcurementController(IProcurementService procurement) => _procurement = procurement;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? departmentId)
    {
        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (int.TryParse(deptClaim, out var userDeptId))
                departmentId = userDeptId;
            else
                return Forbid();
        }
        return Ok(await _procurement.GetAllAsync(status, departmentId));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _procurement.GetByIdAsync(id);
        if (result is null) return NotFound();
        
        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var userDeptId) || result.DepartmentId != userDeptId)
                return Forbid();
        }
        
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead")]
    public async Task<IActionResult> Create([FromBody] CreateProcurementRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var deptClaim = User.FindFirstValue("departmentId");
        if (!int.TryParse(deptClaim, out var deptId))
            return BadRequest(new { message = "User has no department assigned." });

        try
        {
            var result = await _procurement.CreateAsync(dto, userId, deptId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/submit")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead")]
    public async Task<IActionResult> Submit(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.SubmitAsync(id, userId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/approve")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveProcurementDto dto)
    {
        var approverId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.ProcessApprovalAsync(id, dto, approverId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/purchase-order")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff")]
    public async Task<IActionResult> GeneratePO(int id, [FromBody] GeneratePurchaseOrderDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.GeneratePurchaseOrderAsync(id, dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("purchase-orders")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
    public async Task<IActionResult> GetAllPOs()
        => Ok(await _procurement.GetAllPurchaseOrdersAsync());

    [HttpGet("purchase-orders/{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
    public async Task<IActionResult> GetPO(int id)
    {
        var result = await _procurement.GetPurchaseOrderAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("purchase-orders/{id}/confirm-delivery")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> ConfirmDelivery(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _procurement.ConfirmDeliveryAsync(id, userId);
        return ok ? NoContent() : NotFound();
    }
}
