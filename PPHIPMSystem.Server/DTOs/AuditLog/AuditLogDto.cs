namespace PPHIPMSystem.Server.DTOs.AuditLog;

public class AuditLogDto
{
    public long Id { get; set; }
    public string? UserId { get; set; }
    public string? UserFullName { get; set; }
    public string? Username { get; set; }
    public string Action { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public int? RecordId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }
}
