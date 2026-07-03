using PPHIPMSystem.Server.DTOs.Backup;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Interfaces;

public interface IBackupService
{
    Task<BackupDto> CreateBackupAsync(BackupType type, string? triggeredByUserId);
    Task<IEnumerable<BackupDto>> GetAllAsync();
    Task<(byte[] Content, string FileName)?> GetFileAsync(int id);
    Task<bool> DeleteAsync(int id);

    Task<string> GetScheduleTimeAsync();
    Task SetScheduleTimeAsync(string time);
}
