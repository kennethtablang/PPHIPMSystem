using PPHIPMSystem.Server.DTOs.Notification;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Interfaces;

public interface INotificationService
{
    Task<IEnumerable<NotificationDto>> GetForUserAsync(string userId, bool? unreadOnly);
    Task<int> GetUnreadCountAsync(string userId);
    Task MarkAsReadAsync(int notificationId, string userId);
    Task MarkAllAsReadAsync(string userId);
    Task CreateAsync(string userId, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null);
    Task CreateForRoleAsync(UserRole role, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null);
}
