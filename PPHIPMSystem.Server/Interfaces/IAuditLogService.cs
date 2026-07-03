using PPHIPMSystem.Server.DTOs.AuditLog;
using PPHIPMSystem.Server.DTOs.Common;

namespace PPHIPMSystem.Server.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(string? userId, string action, string entityType, int? entityId, string? details = null, string? ipAddress = null);
    Task<PagedResultDto<AuditLogDto>> GetAllAsync(string? search = null, string? action = null,
        DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 50);
}
