namespace PPHIPMSystem.Server.DTOs.Report;

public class ConsumptionReportDto
{
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public IEnumerable<MonthlyConsumptionDto> MonthlyData { get; set; } = [];
    public decimal TotalConsumed { get; set; }
}

public class MonthlyConsumptionDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName => new DateTime(Year, Month, 1).ToString("MMMM yyyy");
    public decimal QuantityConsumed { get; set; }
}

public class ProcurementReportDto
{
    public string RequestNumber { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string RequestedBy { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public DateTime? FinalActionAt { get; set; }
    public double? ProcessingDays { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? PONumber { get; set; }
}

public class ForecastAccuracyReportDto
{
    public string ItemName { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public IEnumerable<ForecastAccuracyPeriodDto> Periods { get; set; } = [];
    public decimal? MeanAbsoluteError { get; set; }
}

public class ForecastAccuracyPeriodDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName => new DateTime(Year, Month, 1).ToString("MMMM yyyy");
    public decimal ForecastedQuantity { get; set; }
    public decimal? ActualQuantity { get; set; }
    public decimal? AbsoluteError => ActualQuantity.HasValue ? Math.Abs(ForecastedQuantity - ActualQuantity.Value) : null;
}

public class ReportFilterDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? CategoryId { get; set; }
    public int? DepartmentId { get; set; }
    public int? ItemId { get; set; }
}
