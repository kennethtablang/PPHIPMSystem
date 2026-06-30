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
    private readonly IEmailService _emailService;
    private readonly Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> _userManager;

    public NotificationService(
        ApplicationDbContext db, 
        IMapper mapper, 
        IHubContext<NotificationHub> hubContext,
        IEmailService emailService,
        Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _mapper = mapper;
        _hubContext = hubContext;
        _emailService = emailService;
        _userManager = userManager;
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
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ReferenceId = referenceId,
            ReferenceType = referenceType
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        var dto = new NotificationDto
        {
            Id = notification.Id,
            Type = notification.Type,
            Title = notification.Title,
            Message = notification.Message,
            IsRead = notification.IsRead,
            ReferenceId = notification.ReferenceId,
            ReferenceType = notification.ReferenceType,
            CreatedAt = notification.CreatedAt
        };
        await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", dto);

        var user = await _userManager.FindByIdAsync(userId);
        if (user != null && !string.IsNullOrEmpty(user.Email))
        {
            var emailBody = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #1a6a36;'>PPH IPMS - New Notification</h2>
                    <h3>{title}</h3>
                    <p style='color: #444; line-height: 1.5;'>{message}</p>
                    <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;' />
                    <p style='font-size: 12px; color: #888;'>This is an automated system notification. Please do not reply.</p>
                </div>";
            await _emailService.SendEmailAsync(user.Email, $"Notification: {title}", emailBody);
        }
    }

    public async Task CreateForRoleAsync(UserRole role, NotificationType type, string title, string message, int? referenceId = null, string? referenceType = null)
    {
        var usersData = await _db.Users
            .Where(u => u.Role == role && u.IsActive)
            .Select(u => new { u.Id, u.Email })
            .ToListAsync();

        var notifications = new List<Notification>();
        foreach (var u in usersData)
        {
            var notification = new Notification
            {
                UserId = u.Id,
                Type = type,
                Title = title,
                Message = message,
                ReferenceId = referenceId,
                ReferenceType = referenceType
            };
            _db.Notifications.Add(notification);
            notifications.Add(notification);
        }
        await _db.SaveChangesAsync();

        foreach (var n in notifications)
        {
            var dto = new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                ReferenceId = n.ReferenceId,
                ReferenceType = n.ReferenceType,
                CreatedAt = n.CreatedAt
            };
            await _hubContext.Clients.User(n.UserId).SendAsync("ReceiveNotification", dto);
            
            var userEmail = usersData.FirstOrDefault(u => u.Id == n.UserId)?.Email;
            if (!string.IsNullOrEmpty(userEmail))
            {
                var emailBody = $@"
                    <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; max-width: 600px; margin: 0 auto;'>
                        <h2 style='color: #1a6a36;'>PPH IPMS - New Notification</h2>
                        <h3>{title}</h3>
                        <p style='color: #444; line-height: 1.5;'>{message}</p>
                        <hr style='border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;' />
                        <p style='font-size: 12px; color: #888;'>This is an automated system notification. Please do not reply.</p>
                    </div>";
                await _emailService.SendEmailAsync(userEmail, $"Notification: {title}", emailBody);
            }
        }
    }
}
