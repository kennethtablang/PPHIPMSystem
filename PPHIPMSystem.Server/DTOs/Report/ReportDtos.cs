namespace PPHIPMSystem.Server.DTOs.Report;

public class ReportFilterDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? Year { get; set; }
    public int? CategoryId { get; set; }
    public int? DepartmentId { get; set; }
    public int? ItemId { get; set; }
}

// ── Consumption Report ────────────────────────────────────────────────────────

public class ConsumptionSummaryDto
{
    public decimal TotalQuantity { get; set; }
    public int UniqueItems { get; set; }
    public int? PeakMonth { get; set; }
    public decimal? PeakMonthQty { get; set; }
    public decimal? AvgMonthlyConsumption { get; set; }
    public IEnumerable<ConsumptionMonthlyTotalDto> ByMonth { get; set; } = [];
    public IEnumerable<ConsumptionTopItemDto> TopItems { get; set; } = [];
}

public class ConsumptionMonthlyTotalDto
{
    public int Month { get; set; }
    public decimal TotalQuantity { get; set; }
}

public class ConsumptionTopItemDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public string Unit { get; set; } = string.Empty;
}

// ── Procurement Report ────────────────────────────────────────────────────────

public class ProcurementSummaryDto
{
    public int TotalRequests { get; set; }
    public int FullyApproved { get; set; }
    public decimal TotalPOAmount { get; set; }
    public int DeliveredPOs { get; set; }
    public int TotalPOs { get; set; }
    public Dictionary<string, int> ByStatus { get; set; } = [];
    public IEnumerable<ProcurementTopSupplierDto> TopSuppliers { get; set; } = [];
}

public class ProcurementTopSupplierDto
{
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public int PoCount { get; set; }
    public decimal TotalAmount { get; set; }
}

// ── Forecast Accuracy Report ──────────────────────────────────────────────────

public class ForecastSummaryDto
{
    public int TotalForecasts { get; set; }
    public int MovingAverageCount { get; set; }
    public int ExpSmoothingCount { get; set; }
    public int ItemsWithForecast { get; set; }
    public int EvaluatedForecasts { get; set; }
    public decimal? OverallMae { get; set; }
    public IEnumerable<ItemForecastSummaryDto> ItemForecasts { get; set; } = [];
}

public class ItemForecastSummaryDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public decimal? LatestForecast { get; set; }
    public decimal? SuggestedReorder { get; set; }
    public decimal CurrentStock { get; set; }
    public bool IsBelowReorder { get; set; }
    public int EvaluatedForecasts { get; set; }
    public decimal? MeanAbsoluteError { get; set; }
}
