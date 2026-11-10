using PPHIPMSystem.Server.DTOs.Notification;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Interfaces;

public interface INotificationService
{
    Task<IEnumerable<NotificationDto>> GetForUserAsync(string userId, bool? unreadOnly);
    Task<int> GetUnreadCountAsync(string userId);
    Task MarkAsReadAsync(int notificationId, string userId);
    Task MarkAllAsReadAsync(string userId);
    Task<NotificationSummaryDto> GetSummaryAsync(string userId);
    Task MarkReferenceAsReadAsync(string userId, string referenceType, int referenceId);
    Task CreateAsync(string userId, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null);
    Task CreateForRoleAsync(UserRole role, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null);

    // Realtime ping (no persistence): tells connected clients stock levels
    // changed so live views (dashboard) can refresh.
    Task BroadcastStockChangedAsync();
}
