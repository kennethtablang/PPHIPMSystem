using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Report;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
public class ReportsController : ControllerBase
{
    private const string XlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IReportService _reports;
    private readonly IReportExportService _exports;

    public ReportsController(IReportService reports, IReportExportService exports)
    {
        _reports = reports;
        _exports = exports;
    }

    [HttpGet("consumption")]
    public async Task<IActionResult> Consumption([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetConsumptionReportAsync(filter));

    [HttpGet("procurement")]
    public async Task<IActionResult> Procurement([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetProcurementReportAsync(filter));

    [HttpGet("forecast-accuracy")]
    public async Task<IActionResult> ForecastAccuracy([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetForecastAccuracyReportAsync(filter));

    // ── Excel document exports ───────────────────────────────────────────────

    [HttpGet("consumption/export")]
    public async Task<IActionResult> ExportConsumption([FromQuery] ReportFilterDto filter)
        => File(await _exports.ExportConsumptionAsync(filter), XlsxMime,
            $"consumption-report-{DateTime.Now:yyyyMMdd}.xlsx");

    [HttpGet("procurement/export")]
    public async Task<IActionResult> ExportProcurement([FromQuery] ReportFilterDto filter)
        => File(await _exports.ExportProcurementAsync(filter), XlsxMime,
            $"procurement-report-{DateTime.Now:yyyyMMdd}.xlsx");

    [HttpGet("forecast-accuracy/export")]
    public async Task<IActionResult> ExportForecastAccuracy([FromQuery] ReportFilterDto filter)
        => File(await _exports.ExportForecastAccuracyAsync(filter), XlsxMime,
            $"forecast-accuracy-report-{DateTime.Now:yyyyMMdd}.xlsx");

    [HttpGet("inventory-snapshot/export")]
    public async Task<IActionResult> ExportInventorySnapshot()
        => File(await _exports.ExportInventorySnapshotAsync(), XlsxMime,
            $"inventory-snapshot-{DateTime.Now:yyyyMMdd}.xlsx");

    [HttpGet("disposals/export")]
    public async Task<IActionResult> ExportDisposalCertificate([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        => File(await _exports.ExportDisposalCertificateAsync(startDate, endDate), XlsxMime,
            $"disposal-certificate-{DateTime.Now:yyyyMMdd}.xlsx");
}
