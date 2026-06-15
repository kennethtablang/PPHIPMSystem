namespace PPHIPMSystem.Server.Models.Enums;

public enum NotificationType
{
    LowStock,
    ExpirationWarning,
    ProcurementSubmitted,
    ProcurementApproved,
    ProcurementRejected,
    ProcurementReturnedForRevision,
    PurchaseOrderGenerated,
    StockAdjustmentRequested,
    StockAdjustmentApproved,
    StockAdjustmentRejected,
    General
}
