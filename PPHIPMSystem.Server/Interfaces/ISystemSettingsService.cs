using PPHIPMSystem.Server.DTOs.System;

namespace PPHIPMSystem.Server.Interfaces;

public interface ISystemSettingsService
{
    Task<SystemSettingsDto> GetAsync();
    Task<SystemSettingsDto> UpdateAsync(SystemSettingsDto dto);

    // Convenience accessors used by other services.
    Task<int> GetBackupRetentionDaysAsync();
    Task<PasswordPolicyDto> GetPasswordPolicyAsync();
}
