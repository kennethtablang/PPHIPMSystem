using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Batch;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ItemBatchesController : ControllerBase
{
    private readonly IItemBatchService _batches;

    public ItemBatchesController(IItemBatchService batches) => _batches = batches;

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _batches.GetAllAsync());

    [HttpGet("by-item/{inventoryItemId}")]
    public async Task<IActionResult> GetByItem(int inventoryItemId)
        => Ok(await _batches.GetByItemAsync(inventoryItemId));

    [HttpGet("expiring")]
    public async Task<IActionResult> GetExpiring([FromQuery] int? warningDays)
        => Ok(await _batches.GetExpiringAsync(warningDays));

    [HttpPost]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Create([FromBody] CreateItemBatchDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _batches.CreateAsync(dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> UpdateDetails(int id, [FromBody] UpdateItemBatchDetailsDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _batches.UpdateDetailsAsync(id, dto, userId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("dispose-expired")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> DisposeExpired([FromBody] string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Disposal reason is required." });
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _batches.DisposeExpiredAsync(reason.Trim(), userId);
        return Ok(result);
    }

    [HttpPatch("{id}/dispose")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Dispose(int id, [FromBody] string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Disposal reason is required." });
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _batches.MarkExpiredForDisposalAsync(id, userId, reason);
        return ok ? NoContent() : NotFound();
    }
}
