namespace PPHIPMSystem.Server.Models.Enums;

public enum StockMovementType
{
    Receipt,
    Issuance,
    Return,
    Disposal,
    Adjustment,

    // Ward-level usage: a department consumed stock it was previously issued.
    // Only the department's balance drops — central QuantityOnHand already fell
    // at issuance, and consumption for forecasting was recorded there too, so
    // this type must never touch either. Appended last: values are stored as
    // ints, so existing rows keep their meaning.
    DepartmentConsumption,

    // Ward-to-ward handover: stock moves from one department's balance to
    // another's. Central QuantityOnHand and batches are untouched — the item
    // never returns to the storeroom — so DepartmentId (source) and
    // ToDepartmentId (destination) carry the whole meaning of the row.
    DepartmentTransfer
}
