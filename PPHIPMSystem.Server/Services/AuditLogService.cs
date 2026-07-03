using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.AuditLog;
using PPHIPMSystem.Server.DTOs.Common;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public AuditLogService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task LogAsync(string? userId, string action, string entityType, int? entityId, string? details = null, string? ipAddress = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task<PagedResultDto<AuditLogDto>> GetAllAsync(string? search = null, string? action = null,
        DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 50)
    {
        var query = _db.AuditLogs.Include(l => l.User).AsQueryable();

        if (startDate.HasValue) query = query.Where(l => l.Timestamp >= startDate.Value);
        if (endDate.HasValue) query = query.Where(l => l.Timestamp <= endDate.Value.AddDays(1));
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(l => l.Action == action);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l =>
                (l.User != null && (l.User.FirstName + " " + l.User.LastName).Contains(search)) ||
                (l.User != null && l.User.UserName!.Contains(search)) ||
                l.EntityType.Contains(search) ||
                (l.Details != null && l.Details.Contains(search)));

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000); // 1000 = the old unpaged cap, used by CSV export

        var total = await query.CountAsync();
        var logs = await query.OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return new PagedResultDto<AuditLogDto>
        {
            Items = _mapper.Map<IEnumerable<AuditLogDto>>(logs),
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }
}
