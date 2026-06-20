using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Supplier;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _suppliers;

    public SuppliersController(ISupplierService suppliers) => _suppliers = suppliers;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
        => Ok(await _suppliers.GetAllAsync(search));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _suppliers.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff")]
    public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
    {
        var result = await _suppliers.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateSupplierDto dto)
    {
        var result = await _suppliers.UpdateAsync(id, dto);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id}/accreditation")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff")]
    public async Task<IActionResult> UpdateAccreditation(int id, [FromBody] AccreditationUpdateDto dto)
    {
        var ok = await _suppliers.UpdateAccreditationAsync(id, dto.IsAccredited, dto.AccreditationExpiry);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("{id}/orders")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
    public async Task<IActionResult> GetOrders(int id)
        => Ok(await _suppliers.GetOrdersAsync(id));

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _suppliers.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}

public class AccreditationUpdateDto
{
    public bool IsAccredited { get; set; }
    public DateTime? AccreditationExpiry { get; set; }
}
