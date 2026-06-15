using PPHIPMSystem.Server.DTOs.Report;

namespace PPHIPMSystem.Server.Interfaces;

public interface IReportService
{
    Task<ConsumptionSummaryDto> GetConsumptionReportAsync(ReportFilterDto filter);
    Task<ProcurementSummaryDto> GetProcurementReportAsync(ReportFilterDto filter);
    Task<ForecastSummaryDto> GetForecastAccuracyReportAsync(ReportFilterDto filter);
}
