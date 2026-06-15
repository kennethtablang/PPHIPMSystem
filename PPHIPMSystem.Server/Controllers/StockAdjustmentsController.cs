using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.StockAdjustment;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StockAdjustmentsController : ControllerBase
{
    private readonly IStockAdjustmentService _adjustments;

    public StockAdjustmentsController(IStockAdjustmentService adjustments) => _adjustments = adjustments;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
        => Ok(await _adjustments.GetAllAsync(status));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _adjustments.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Create([FromBody] CreateStockAdjustmentDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _adjustments.CreateAsync(dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/approve")]
    [Authorize(Roles = "HospitalAdministrator")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveAdjustmentDto dto)
    {
        var approverId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _adjustments.ProcessApprovalAsync(id, dto, approverId);
        return result is null ? NotFound() : Ok(result);
    }
}
