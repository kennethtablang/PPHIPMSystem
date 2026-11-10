using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Notification;

public class NotificationDto
{
    public int Id { get; set; }
    public NotificationType Type { get; set; }
    public string TypeName => Type.ToString();
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public int? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

// Unread notifications grouped by the kind of record they point at
// (ProcurementRequest, PurchaseOrder, InventoryItem, ...), for sidebar badges.
public class NotificationSummaryDto
{
    public int Total { get; set; }
    public Dictionary<string, int> ByReferenceType { get; set; } = [];
}
