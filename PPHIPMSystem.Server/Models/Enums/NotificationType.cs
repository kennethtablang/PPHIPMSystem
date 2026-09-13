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
    General,

    // A department has passed its fiscal-year appropriation, or is closing on
    // it. Appended last: values are stored as ints, so existing rows keep their
    // meaning.
    BudgetAlert
}
