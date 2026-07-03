using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Inventory;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private const string XlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IInventoryService _inventory;
    private readonly IInventoryImportService _import;

    public InventoryController(IInventoryService inventory, IInventoryImportService import)
    {
        _inventory = inventory;
        _import = import;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        return Ok(await _inventory.GetDashboardSummaryAsync(userId));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] bool? lowStock)
        => Ok(await _inventory.GetAllAsync(search, categoryId, lowStock));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _inventory.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    // ── Bulk import from spreadsheet ─────────────────────────────────────────

    [HttpGet("import/template")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public IActionResult ImportTemplate()
        => File(_import.BuildTemplate(), XlsxMime, "item-import-template.xlsx");

    [HttpPost("import/preview")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> ImportPreview(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "Select an .xlsx file to upload." });
        try
        {
            await using var stream = file.OpenReadStream();
            return Ok(await _import.PreviewAsync(stream));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("import")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> Import(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "Select an .xlsx file to upload." });
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            await using var stream = file.OpenReadStream();
            return Ok(await _import.ImportAsync(stream, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Create([FromBody] CreateInventoryItemDto dto)
    {
        try
        {
            var result = await _inventory.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInventoryItemDto dto)
    {
        try
        {
            var result = await _inventory.UpdateAsync(id, dto);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "HospitalAdministrator")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _inventory.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
