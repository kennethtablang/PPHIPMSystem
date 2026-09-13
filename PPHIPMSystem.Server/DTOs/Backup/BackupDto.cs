using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.DTOs.Backup;

public class BackupDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int RecordCount { get; set; }
    public BackupType Type { get; set; }
    public BackupStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public string? TriggeredByName { get; set; }
    public DateTime CreatedAt { get; set; }
    // True when a restorable SQL .bak sits alongside the Excel export.
    public bool HasDatabaseFile { get; set; }
}
