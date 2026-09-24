namespace PPHIPMSystem.Server.Models.Enums;

// Two kinds of request share the ProcurementRequest table:
//  - DepartmentSupply: a ward asks for supplies from the storeroom. Inventory
//    checks stock and allocates, the Administrator approves, the system
//    releases into the ward's stock.
//  - Replenishment: the Supply Officer (Procurement) raises a Purchase
//    Request to restock the storeroom itself. The Administrator (Chief of
//    Hospital) approves, Procurement orders it, and the delivery lands in
//    central stock — it is never allocated or issued to a ward.
public enum RequestType
{
    DepartmentSupply,
    Replenishment
}
