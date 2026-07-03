using System.ComponentModel.DataAnnotations;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Models;

public class Backup
{
    public int Id { get; set; }

    [MaxLength(260)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }
    public int RecordCount { get; set; }

    public BackupType Type { get; set; }
    public BackupStatus Status { get; set; }

    [MaxLength(2000)]
    public string? ErrorMessage { get; set; }

    public string? TriggeredByUserId { get; set; }

    [MaxLength(200)]
    public string? TriggeredByName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
