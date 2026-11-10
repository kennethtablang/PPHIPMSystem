namespace PPHIPMSystem.Server.Models.Enums;

public enum ProcurementStatus
{
    Draft,
    SubmittedToProcurement,
    ApprovedByProcurement,
    ReturnedForRevision,
    Rejected,
    FullyApproved,
    PurchaseOrderGenerated,
    Delivered,
    Cancelled,
    SubmittedByDepartment,
    ApprovedByInventoryOfficer,

    // Final approval found enough central stock, so the approved quantities
    // were issued straight into the requesting department's stock. Appended
    // last: values are stored as ints, so existing rows keep their meaning.
    Released,

    // The Department Head confirmed the released supplies were received —
    // the request is complete. Appended last for the same reason as Released.
    Received
}

