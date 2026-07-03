using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.StockMovement;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StockMovementsController : ControllerBase
{
    private readonly IStockMovementService _movements;

    public StockMovementsController(IStockMovementService movements) => _movements = movements;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? itemId,
        [FromQuery] string? type,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
        => Ok(await _movements.GetAllAsync(itemId, type, from, to, page, pageSize));

    [HttpPost]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Create([FromBody] CreateStockMovementDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _movements.CreateAsync(dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/void")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Void(int id, [FromBody] VoidStockMovementDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _movements.VoidAsync(id, dto.Reason, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
