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

    // A delivery was received late, short, damaged or substandard. Takes the
    // slot of the removed BudgetAlert; the migration that introduced it
    // deleted the old budget notifications so none are misread as this.
    DeliveryProblem
}
