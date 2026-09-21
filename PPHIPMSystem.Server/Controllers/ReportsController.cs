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

    [HttpGet("item-rankings")]
    public async Task<IActionResult> ItemRankings([FromQuery] ReportFilterDto filter)
        => Ok(await _reports.GetItemRankingsAsync(filter));

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

    [HttpGet("item-rankings/export")]
    public async Task<IActionResult> ExportItemRankings([FromQuery] ReportFilterDto filter)
        => File(await _exports.ExportItemRankingsAsync(filter), XlsxMime,
            $"item-rankings-report-{DateTime.Now:yyyyMMdd}.xlsx");

    [HttpGet("inventory-snapshot/export")]
    public async Task<IActionResult> ExportInventorySnapshot()
        => File(await _exports.ExportInventorySnapshotAsync(), XlsxMime,
            $"inventory-snapshot-{DateTime.Now:yyyyMMdd}.xlsx");

    // Narrower than the rest of this controller on purpose: budget figures are
    // for the people who hold the money, matching the Budgets page's own roles.
    [HttpGet("department-budgets/export")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff")]
    public async Task<IActionResult> ExportDepartmentBudgets([FromQuery] int? year)
    {
        var fiscalYear = year ?? DateTime.UtcNow.Year;
        if (fiscalYear is < 2000 or > 2200)
            return BadRequest(new { message = "Fiscal year is out of range." });

        return File(await _exports.ExportDepartmentBudgetsAsync(fiscalYear), XlsxMime,
            $"department-budgets-FY{fiscalYear}.xlsx");
    }

    [HttpGet("disposals/export")]
    public async Task<IActionResult> ExportDisposalCertificate([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        => File(await _exports.ExportDisposalCertificateAsync(startDate, endDate), XlsxMime,
            $"disposal-certificate-{DateTime.Now:yyyyMMdd}.xlsx");

    [HttpGet("requests/{id}/ris")]
    public async Task<IActionResult> ExportRis(int id)
    {
        var bytes = await _exports.ExportRequisitionSlipAsync(id);
        return bytes is null ? NotFound() : File(bytes, XlsxMime, $"ris-{id}.xlsx");
    }

    [HttpGet("requests/{id}/purchase-request")]
    public async Task<IActionResult> ExportPurchaseRequest(int id)
    {
        var bytes = await _exports.ExportPurchaseRequestAsync(id);
        return bytes is null ? NotFound() : File(bytes, XlsxMime, $"purchase-request-{id}.xlsx");
    }
}
