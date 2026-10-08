namespace PPHIPMSystem.Server.Models.Enums;

// Problems the receiving clerk can record against a delivery. Flags: one
// shipment can be both late and short, a line both damaged and substandard.
[Flags]
public enum DeliveryIssue
{
    None = 0,
    Delayed = 1,
    Incomplete = 2,
    Damaged = 4,
    Substandard = 8
}
