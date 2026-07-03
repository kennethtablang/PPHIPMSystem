using PPHIPMSystem.Server.DTOs.Report;

namespace PPHIPMSystem.Server.Interfaces;

public interface IReportExportService
{
    // Each returns a ready-to-download .xlsx workbook.
    Task<byte[]> ExportConsumptionAsync(ReportFilterDto filter);
    Task<byte[]> ExportProcurementAsync(ReportFilterDto filter);
    Task<byte[]> ExportForecastAccuracyAsync(ReportFilterDto filter);
    Task<byte[]> ExportInventorySnapshotAsync();
}
