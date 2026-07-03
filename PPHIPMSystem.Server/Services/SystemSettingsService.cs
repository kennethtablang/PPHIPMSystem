using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.System;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

// Server-wide, admin-configurable settings backed by the SystemSetting key/value table.
public class SystemSettingsService : ISystemSettingsService
{
    // Keys (BackupScheduleTime is shared with BackupService/scheduler).
    public const string OrgNameKey = "OrganizationName";
    public const string BackupTimeKey = "BackupScheduleTime";
    public const string BackupRetentionKey = "BackupRetentionDays";
    public const string DefaultExpWarnDaysKey = "DefaultExpirationWarningDays";
    public const string DefaultReorderThresholdKey = "DefaultReorderThreshold";
    public const string AnnouncementKey = "AnnouncementMessage";
    public const string AnnouncementStartsKey = "AnnouncementStartsAt";
    public const string AnnouncementEndsKey = "AnnouncementEndsAt";
    public const string PasswordMinLengthKey = "PasswordMinLength";
    public const string PasswordRequireSpecialKey = "PasswordRequireSpecial";
    public const string NotificationRetentionKey = "NotificationRetentionDays";
    public const string AuditLogRetentionKey = "AuditLogRetentionDays";
    public const string MonthlyReportEmailsKey = "MonthlyReportEmails";
    // Bookkeeping (not exposed in the settings UI): last month a report email went out.
    public const string MonthlyReportLastSentKey = "MonthlyReportLastSent";

    private const string DefaultOrgName = "Pangasinan Provincial Hospital";
    private const string DefaultBackupTime = "00:00";
    private const int DefaultRetentionDays = 30;
    private const int DefaultExpWarnDays = 30;
    private const int DefaultReorderThreshold = 0;
    private const int DefaultPasswordMinLength = 8;

    private readonly ApplicationDbContext _db;

    public SystemSettingsService(ApplicationDbContext db) => _db = db;

    public async Task<SystemSettingsDto> GetAsync()
    {
        var all = await _db.SystemSettings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value);
        return new SystemSettingsDto
        {
            OrganizationName = all.GetValueOrDefault(OrgNameKey, DefaultOrgName),
            BackupTime = all.GetValueOrDefault(BackupTimeKey, DefaultBackupTime),
            BackupRetentionDays = int.TryParse(all.GetValueOrDefault(BackupRetentionKey), out var d) ? d : DefaultRetentionDays,
            DefaultExpirationWarningDays = int.TryParse(all.GetValueOrDefault(DefaultExpWarnDaysKey), out var e) ? e : DefaultExpWarnDays,
            DefaultReorderThreshold = int.TryParse(all.GetValueOrDefault(DefaultReorderThresholdKey), out var r) ? r : DefaultReorderThreshold,
            AnnouncementMessage = all.GetValueOrDefault(AnnouncementKey, string.Empty),
            AnnouncementStartsAt = DateTime.TryParse(all.GetValueOrDefault(AnnouncementStartsKey), out var ast) ? ast : null,
            AnnouncementEndsAt = DateTime.TryParse(all.GetValueOrDefault(AnnouncementEndsKey), out var aen) ? aen : null,
            PasswordMinLength = int.TryParse(all.GetValueOrDefault(PasswordMinLengthKey), out var p) ? p : DefaultPasswordMinLength,
            PasswordRequireSpecial = !bool.TryParse(all.GetValueOrDefault(PasswordRequireSpecialKey), out var s) || s,
            NotificationRetentionDays = int.TryParse(all.GetValueOrDefault(NotificationRetentionKey), out var nr) ? nr : 90,
            AuditLogRetentionDays = int.TryParse(all.GetValueOrDefault(AuditLogRetentionKey), out var ar) ? ar : 0,
            MonthlyReportEmails = bool.TryParse(all.GetValueOrDefault(MonthlyReportEmailsKey), out var mr) && mr,
        };
    }

    public async Task<SystemSettingsDto> UpdateAsync(SystemSettingsDto dto)
    {
        await SetAsync(OrgNameKey, dto.OrganizationName);
        await SetAsync(BackupTimeKey, dto.BackupTime);
        await SetAsync(BackupRetentionKey, dto.BackupRetentionDays.ToString());
        await SetAsync(DefaultExpWarnDaysKey, dto.DefaultExpirationWarningDays.ToString());
        await SetAsync(DefaultReorderThresholdKey, dto.DefaultReorderThreshold.ToString());
        await SetAsync(AnnouncementKey, dto.AnnouncementMessage?.Trim() ?? string.Empty);
        await SetAsync(AnnouncementStartsKey, dto.AnnouncementStartsAt?.ToString("O") ?? string.Empty);
        await SetAsync(AnnouncementEndsKey, dto.AnnouncementEndsAt?.ToString("O") ?? string.Empty);
        await SetAsync(PasswordMinLengthKey, dto.PasswordMinLength.ToString());
        await SetAsync(PasswordRequireSpecialKey, dto.PasswordRequireSpecial.ToString());
        await SetAsync(NotificationRetentionKey, dto.NotificationRetentionDays.ToString());
        await SetAsync(AuditLogRetentionKey, dto.AuditLogRetentionDays.ToString());
        await SetAsync(MonthlyReportEmailsKey, dto.MonthlyReportEmails.ToString());
        await _db.SaveChangesAsync();
        return await GetAsync();
    }

    public async Task<int> GetBackupRetentionDaysAsync()
    {
        var setting = await _db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == BackupRetentionKey);
        return int.TryParse(setting?.Value, out var d) ? d : DefaultRetentionDays;
    }

    // Used by SystemPasswordValidator and the anonymous password-policy endpoint.
    public async Task<PasswordPolicyDto> GetPasswordPolicyAsync()
    {
        var keys = new[] { PasswordMinLengthKey, PasswordRequireSpecialKey };
        var all = await _db.SystemSettings.AsNoTracking()
            .Where(s => keys.Contains(s.Key))
            .ToDictionaryAsync(s => s.Key, s => s.Value);
        return new PasswordPolicyDto
        {
            MinLength = int.TryParse(all.GetValueOrDefault(PasswordMinLengthKey), out var p) ? p : DefaultPasswordMinLength,
            RequireSpecial = !bool.TryParse(all.GetValueOrDefault(PasswordRequireSpecialKey), out var s) || s,
        };
    }

    private async Task SetAsync(string key, string value)
    {
        var setting = await _db.SystemSettings.FindAsync(key);
        if (setting is null)
            _db.SystemSettings.Add(new SystemSetting { Key = key, Value = value });
        else
            setting.Value = value;
    }
}
