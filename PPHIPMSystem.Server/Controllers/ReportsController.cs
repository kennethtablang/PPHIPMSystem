using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Report;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;

    public ReportsController(IReportService reports) => _reports = reports;

    [HttpGet("consumption")]
    public async Task<IActionResult> Consumption([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetConsumptionReportAsync(filter));

    [HttpGet("procurement")]
    public async Task<IActionResult> Procurement([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetProcurementReportAsync(filter));

    [HttpGet("forecast-accuracy")]
    public async Task<IActionResult> ForecastAccuracy([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetForecastAccuracyReportAsync(filter));
}
