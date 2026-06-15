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
        var result = await _batches.CreateAsync(dto, userId);
        return Ok(result);
    }

    [HttpPatch("{id}/dispose")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Dispose(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ok = await _batches.MarkExpiredForDisposalAsync(id, userId);
        return ok ? NoContent() : NotFound();
    }
}
