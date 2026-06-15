using PPHIPMSystem.Server.DTOs.AuditLog;

namespace PPHIPMSystem.Server.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(string? userId, string action, string entityType, int? entityId, string? details = null, string? ipAddress = null);
    Task<IEnumerable<AuditLogDto>> GetAllAsync(DateTime? from, DateTime? to, string? entityType, string? userId);
}
