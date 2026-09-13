using PPHIPMSystem.Server.DTOs.Report;

namespace PPHIPMSystem.Server.Interfaces;

public interface IReportExportService
{
    // Each returns a ready-to-download .xlsx workbook.
    Task<byte[]> ExportConsumptionAsync(ReportFilterDto filter);
    Task<byte[]> ExportProcurementAsync(ReportFilterDto filter);
    Task<byte[]> ExportForecastAccuracyAsync(ReportFilterDto filter);
    Task<byte[]> ExportInventorySnapshotAsync();
    Task<byte[]> ExportDepartmentBudgetsAsync(int fiscalYear);
    Task<byte[]> ExportDisposalCertificateAsync(DateTime startDate, DateTime endDate);

    // LGU forms for a procurement request; null when the request doesn't exist.
    Task<byte[]?> ExportRequisitionSlipAsync(int requestId);
    Task<byte[]?> ExportPurchaseRequestAsync(int requestId);
}
