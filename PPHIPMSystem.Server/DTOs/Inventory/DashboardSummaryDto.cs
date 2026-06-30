namespace PPHIPMSystem.Server.DTOs.Inventory;

public class DashboardSummaryDto
{
    public int TotalItems { get; set; }
    public int LowStockCount { get; set; }
    public int ExpiringItemCount { get; set; }
    public int ExpiredItemCount { get; set; }
    public int PendingProcurementRequests { get; set; }
    public int PendingStockAdjustments { get; set; }
    public int UnreadNotifications { get; set; }
    public IEnumerable<LowStockAlertDto> LowStockItems { get; set; } = [];
    public IEnumerable<ExpiringBatchAlertDto> ExpiringBatches { get; set; } = [];
    public IEnumerable<RecentTransactionDto> RecentTransactions { get; set; } = [];
    
    public IEnumerable<StockByCategoryDto> StockByCategory { get; set; } = [];
    public IEnumerable<MonthlyTrendDto> MonthlyTrends { get; set; } = [];
}

public class StockByCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal TotalValue { get; set; }
    public int ItemCount { get; set; }
}

public class MonthlyTrendDto
{
    public string Month { get; set; } = string.Empty;
    public decimal ProcurementValue { get; set; }
    public decimal ConsumptionValue { get; set; }
}
public class LowStockAlertDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public decimal QuantityOnHand { get; set; }
    public decimal ReorderThreshold { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
}

public class ExpiringBatchAlertDto
{
    public int BatchId { get; set; }
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? LotNumber { get; set; }
    public decimal RemainingQuantity { get; set; }
    public DateTime ExpirationDate { get; set; }
    public int DaysUntilExpiry { get; set; }
}

public class RecentTransactionDto
{
    public string TransactionType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int? ReferenceId { get; set; }
    public int? InventoryItemId { get; set; }
    public string? InventoryItemName { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
}
