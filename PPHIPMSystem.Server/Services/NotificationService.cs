using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Notification;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;
using Microsoft.AspNetCore.SignalR;
using PPHIPMSystem.Server.Hubs;

namespace PPHIPMSystem.Server.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IEmailQueue _emailQueue;

    public NotificationService(
        ApplicationDbContext db,
        IMapper mapper,
        IHubContext<NotificationHub> hubContext,
        IEmailQueue emailQueue)
    {
        _db = db;
        _mapper = mapper;
        _hubContext = hubContext;
        _emailQueue = emailQueue;
    }

    public async Task<IEnumerable<NotificationDto>> GetForUserAsync(string userId, bool? unreadOnly)
    {
        var query = _db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly == true) query = query.Where(n => !n.IsRead);
        var items = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
        return _mapper.Map<IEnumerable<NotificationDto>>(items);
    }

    public async Task<int> GetUnreadCountAsync(string userId) =>
        await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    // Unread notifications per kind of record they point at, so the sidebar
    // can badge the page where the user has something new ("Requests 3 New").
    public async Task<NotificationSummaryDto> GetSummaryAsync(string userId)
    {
        var groups = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .GroupBy(n => n.ReferenceType ?? "")
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync();
        return new NotificationSummaryDto
        {
            Total = groups.Sum(g => g.Count),
            ByReferenceType = groups.Where(g => g.Key != "").ToDictionary(g => g.Key, g => g.Count),
        };
    }

    public async Task MarkAsReadAsync(int notificationId, string userId)
    {
        await _db.Notifications
            .Where(x => x.Id == notificationId && x.UserId == userId && !x.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true).SetProperty(x => x.ReadAt, DateTime.UtcNow));
    }

    public async Task MarkAllAsReadAsync(string userId)
    {
        await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true).SetProperty(x => x.ReadAt, DateTime.UtcNow));
    }

    // Opening a record counts as seeing every notice about it, so the badge
    // for that page clears without hunting each one down in the list.
    public async Task MarkReferenceAsReadAsync(string userId, string referenceType, int referenceId)
    {
        await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead && n.ReferenceType == referenceType && n.ReferenceId == referenceId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true).SetProperty(x => x.ReadAt, DateTime.UtcNow));
    }

    public Task BroadcastStockChangedAsync()
        => _hubContext.Clients.All.SendAsync("StockChanged");

    // Messages built from user text (urgent reasons, delivery problems, item
    // names) can outgrow the columns; clip instead of failing the save.
    private static string Clip(string text, int max) => text.Length <= max ? text : text[..(max - 1)] + "…";

    private record Recipient(string Id, string? Email, bool EmailEnabled, bool Inventory, bool Procurement, bool Adjustments);

    public async Task CreateAsync(string userId, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null)
    {
        var recipients = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new Recipient(u.Id, u.Email, u.EmailNotificationsEnabled,
                u.EmailNotifyInventory, u.EmailNotifyProcurement, u.EmailNotifyAdjustments))
            .ToListAsync();
        if (recipients.Count == 0) return;
        await DeliverAsync(recipients, type, title, message, referenceId, referenceType);
    }

    public async Task CreateForRoleAsync(UserRole role, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null)
    {
        var recipients = await _db.Users
            .Where(u => u.Role == role && u.IsActive)
            .Select(u => new Recipient(u.Id, u.Email, u.EmailNotificationsEnabled,
                u.EmailNotifyInventory, u.EmailNotifyProcurement, u.EmailNotifyAdjustments))
            .ToListAsync();
        if (recipients.Count == 0) return;
        await DeliverAsync(recipients, type, title, message, referenceId, referenceType);
    }

    // One insert for every recipient, then the live push (pop-up + badge) and
    // a queued email. Nothing here waits on the mail server.
    private async Task DeliverAsync(List<Recipient> recipients, NotificationType type, string title, string message,
        int? referenceId, string? referenceType)
    {
        title = Clip(title, 200);
        message = Clip(message, 1000);

        var rows = recipients.Select(r => new Notification
        {
            UserId = r.Id,
            Type = type,
            Title = title,
            Message = message,
            ReferenceId = referenceId,
            ReferenceType = referenceType
        }).ToList();
        _db.Notifications.AddRange(rows);
        await _db.SaveChangesAsync();

        await Task.WhenAll(rows.Select(n => _hubContext.Clients.User(n.UserId).SendAsync("ReceiveNotification", new NotificationDto
        {
            Id = n.Id,
            Type = n.Type,
            Title = n.Title,
            Message = n.Message,
            IsRead = n.IsRead,
            ReferenceId = n.ReferenceId,
            ReferenceType = n.ReferenceType,
            CreatedAt = n.CreatedAt
        })));

        foreach (var r in recipients)
        {
            if (string.IsNullOrEmpty(r.Email) || !r.EmailEnabled
                || !CategoryAllowed(type, r.Inventory, r.Procurement, r.Adjustments))
                continue;
            _emailQueue.Enqueue(new QueuedEmail(r.Email, $"Notification: {title}", EmailBody(title, message)));
        }
    }

    private static string EmailBody(string title, string message)
    {
        var t = System.Net.WebUtility.HtmlEncode(title);
        var m = System.Net.WebUtility.HtmlEncode(message);
        return $@"
            <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #1a6a36;'>PPH IPMS - New Notification</h2>
                <h3>{t}</h3>
                <p style='color: #444; line-height: 1.5;'>{m}</p>
                <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;' />
                <p style='font-size: 12px; color: #888;'>This is an automated system notification. Please do not reply.</p>
            </div>";
    }

    private static bool CategoryAllowed(NotificationType type, bool inventory, bool procurement, bool adjustments) => type switch
    {
        NotificationType.LowStock or NotificationType.ExpirationWarning => inventory,
        NotificationType.ProcurementSubmitted or NotificationType.ProcurementApproved
            or NotificationType.ProcurementRejected or NotificationType.ProcurementReturnedForRevision
            or NotificationType.PurchaseOrderGenerated => procurement,
        NotificationType.StockAdjustmentRequested or NotificationType.StockAdjustmentApproved
            or NotificationType.StockAdjustmentRejected => adjustments,
        _ => true, // General and anything else follows the master switch only
    };
}
