using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Forecast;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ForecastController : ControllerBase
{
    private readonly IForecastService _forecast;

    public ForecastController(IForecastService forecast) => _forecast = forecast;

    [HttpGet]
    public async Task<IActionResult> GetForecasts([FromQuery] int? itemId, [FromQuery] int? year)
        => Ok(await _forecast.GetForecastsAsync(itemId, year));

    [HttpPost("generate")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer,ProcurementStaff")]
    public async Task<IActionResult> Generate([FromBody] ForecastRequestDto dto)
    {
        try
        {
            var result = await _forecast.GenerateForecastAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("consumption/{itemId}")]
    public async Task<IActionResult> GetConsumption(int itemId)
        => Ok(await _forecast.GetConsumptionRecordsAsync(itemId));

    [HttpPost("consumption")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> UpsertConsumption([FromBody] CreateConsumptionRecordDto dto)
    {
        var result = await _forecast.UpsertConsumptionRecordAsync(dto);
        return Ok(result);
    }

    [HttpPost("consumption/{itemId}/sync")]
    [Authorize(Roles = "HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> SyncConsumption(int itemId)
    {
        var result = await _forecast.SyncConsumptionRecordsAsync(itemId);
        return result ? Ok(new { message = "Synced successfully." }) : NotFound();
    }
}
