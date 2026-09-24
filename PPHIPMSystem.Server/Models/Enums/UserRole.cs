namespace PPHIPMSystem.Server.Models.Enums;

public enum UserRole
{
    InventoryOfficer,
    ProcurementStaff,
    DepartmentHead,
    HospitalAdministrator,
    SuperAdmin,

    // Shared department account (one designated PC per ward). Staff can see
    // their department's stock and file supply requests without waiting for
    // the head; approvals and every other restricted function stay with named
    // users. Appended last: roles are stored as ints.
    DepartmentStaff
}
