using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Notification;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public NotificationService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<NotificationDto>> GetForUserAsync(string userId, bool? unreadOnly)
    {
        var query = _db.Notifications.Where(n => n.UserId == userId).AsQueryable();
        if (unreadOnly == true) query = query.Where(n => !n.IsRead);
        var items = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
        return _mapper.Map<IEnumerable<NotificationDto>>(items);
    }

    public async Task<int> GetUnreadCountAsync(string userId) =>
        await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task MarkAsReadAsync(int notificationId, string userId)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
        if (n is null) return;
        n.IsRead = true;
        n.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(string userId)
    {
        var unread = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread) { n.IsRead = true; n.ReadAt = DateTime.UtcNow; }
        await _db.SaveChangesAsync();
    }

    public async Task CreateAsync(string userId, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ReferenceId = referenceId,
            ReferenceType = referenceType
        });
        await _db.SaveChangesAsync();
    }

    public async Task CreateForRoleAsync(UserRole role, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null)
    {
        var users = await _db.Users.Where(u => u.Role == role && u.IsActive).Select(u => u.Id).ToListAsync();
        foreach (var uid in users)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = uid,
                Type = type,
                Title = title,
                Message = message,
                ReferenceId = referenceId,
                ReferenceType = referenceType
            });
        }
        await _db.SaveChangesAsync();
    }
}
