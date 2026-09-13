using PPHIPMSystem.Server.DTOs.Backup;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Interfaces;

public interface IBackupService
{
    Task<BackupDto> CreateBackupAsync(BackupType type, string? triggeredByUserId);
    Task<IEnumerable<BackupDto>> GetAllAsync();
    // format: "xlsx" (data export) or "bak" (SQL database backup).
    Task<(byte[] Content, string FileName)?> GetFileAsync(int id, string format = "xlsx");
    // RESTORE VERIFYONLY against the .bak; null message = passed.
    Task<(bool Ok, string Message)> VerifyAsync(int id);
    Task<bool> DeleteAsync(int id);

    Task<string> GetScheduleTimeAsync();
    Task SetScheduleTimeAsync(string time);
}
