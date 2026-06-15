using PPHIPMSystem.Server.DTOs.Report;

namespace PPHIPMSystem.Server.Interfaces;

public interface IReportService
{
    Task<IEnumerable<ConsumptionReportDto>> GetConsumptionReportAsync(ReportFilterDto filter);
    Task<IEnumerable<ProcurementReportDto>> GetProcurementReportAsync(ReportFilterDto filter);
    Task<IEnumerable<ForecastAccuracyReportDto>> GetForecastAccuracyReportAsync(ReportFilterDto filter);
}
