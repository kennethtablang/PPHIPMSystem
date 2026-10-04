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
    public const string EnforceDepartmentBudgetKey = "EnforceDepartmentBudget";
    // Purchase Request (Appendix 47) header and signatories.
    public const string PrLguKey = "PrLgu";
    public const string PrDepartmentKey = "PrDepartment";
    public const string PrRequestedByNameKey = "PrRequestedByName";
    public const string PrRequestedByDesignationKey = "PrRequestedByDesignation";
    public const string PrCashAvailabilityNameKey = "PrCashAvailabilityName";
    public const string PrCashAvailabilityDesignationKey = "PrCashAvailabilityDesignation";
    public const string PrApproverNameKey = "PrApproverName";
    public const string PrApproverDesignationKey = "PrApproverDesignation";
    // Letterhead and Requisition and Issue Slip (FRM-ADM-SUP-011).
    public const string LetterheadAddressKey = "LetterheadAddress";
    public const string LetterheadCertificationKey = "LetterheadCertification";
    public const string RisApprover1NameKey = "RisApprover1Name";
    public const string RisApprover1DesignationKey = "RisApprover1Designation";
    public const string RisApprover2NameKey = "RisApprover2Name";
    public const string RisApprover2DesignationKey = "RisApprover2Designation";
    public const string RisFormCodeKey = "RisFormCode";
    public const string RisRevisionNoKey = "RisRevisionNo";
    public const string RisRevisionDateKey = "RisRevisionDate";
    // Bookkeeping (not exposed in the settings UI): last month a report email went out.
    public const string MonthlyReportLastSentKey = "MonthlyReportLastSent";

    private const string DefaultOrgName = "Pangasinan Provincial Hospital";
    private const string DefaultBackupTime = "00:00";
    private const int DefaultRetentionDays = 30;
    private const int DefaultExpWarnDays = 30;
    private const int DefaultReorderThreshold = 0;
    private const int DefaultPasswordMinLength = 8;

    // Defaults match the hospital's current paper forms; signatory names are
    // left blank so a fresh install never prints someone's name by mistake.
    private static readonly Dictionary<string, string> FormDefaults = new()
    {
        [PrLguKey] = "PROVINCIAL GOVERNMENT OF PANGASINAN",
        [PrDepartmentKey] = "PPH",
        [PrRequestedByNameKey] = "",
        [PrRequestedByDesignationKey] = "Chief of Hospital II",
        [PrCashAvailabilityNameKey] = "",
        [PrCashAvailabilityDesignationKey] = "Provincial Treasurer",
        [PrApproverNameKey] = "",
        [PrApproverDesignationKey] = "PHMSO Head",
        [LetterheadAddressKey] = "Bolingit, San Carlos City, Pangasinan, Philippines 2420",
        [LetterheadCertificationKey] = "ISO 9001        CIP/4773/14/02/875",
        [RisApprover1NameKey] = "",
        [RisApprover1DesignationKey] = "OIC - Chief of Ancillary Service",
        [RisApprover2NameKey] = "",
        [RisApprover2DesignationKey] = "Chief Nurse",
        [RisFormCodeKey] = "FRM-ADM-SUP-011",
        [RisRevisionNoKey] = "04",
        [RisRevisionDateKey] = "02-01-2026",
    };

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
            // Unset means on: a budget an admin bothered to enter should bite.
            EnforceDepartmentBudget = !bool.TryParse(all.GetValueOrDefault(EnforceDepartmentBudgetKey), out var eb) || eb,
            PrLgu = all.GetValueOrDefault(PrLguKey, FormDefaults[PrLguKey]),
            PrDepartment = all.GetValueOrDefault(PrDepartmentKey, FormDefaults[PrDepartmentKey]),
            PrRequestedByName = all.GetValueOrDefault(PrRequestedByNameKey, FormDefaults[PrRequestedByNameKey]),
            PrRequestedByDesignation = all.GetValueOrDefault(PrRequestedByDesignationKey, FormDefaults[PrRequestedByDesignationKey]),
            PrCashAvailabilityName = all.GetValueOrDefault(PrCashAvailabilityNameKey, FormDefaults[PrCashAvailabilityNameKey]),
            PrCashAvailabilityDesignation = all.GetValueOrDefault(PrCashAvailabilityDesignationKey, FormDefaults[PrCashAvailabilityDesignationKey]),
            PrApproverName = all.GetValueOrDefault(PrApproverNameKey, FormDefaults[PrApproverNameKey]),
            PrApproverDesignation = all.GetValueOrDefault(PrApproverDesignationKey, FormDefaults[PrApproverDesignationKey]),
            LetterheadAddress = all.GetValueOrDefault(LetterheadAddressKey, FormDefaults[LetterheadAddressKey]),
            LetterheadCertification = all.GetValueOrDefault(LetterheadCertificationKey, FormDefaults[LetterheadCertificationKey]),
            RisApprover1Name = all.GetValueOrDefault(RisApprover1NameKey, FormDefaults[RisApprover1NameKey]),
            RisApprover1Designation = all.GetValueOrDefault(RisApprover1DesignationKey, FormDefaults[RisApprover1DesignationKey]),
            RisApprover2Name = all.GetValueOrDefault(RisApprover2NameKey, FormDefaults[RisApprover2NameKey]),
            RisApprover2Designation = all.GetValueOrDefault(RisApprover2DesignationKey, FormDefaults[RisApprover2DesignationKey]),
            RisFormCode = all.GetValueOrDefault(RisFormCodeKey, FormDefaults[RisFormCodeKey]),
            RisRevisionNo = all.GetValueOrDefault(RisRevisionNoKey, FormDefaults[RisRevisionNoKey]),
            RisRevisionDate = all.GetValueOrDefault(RisRevisionDateKey, FormDefaults[RisRevisionDateKey]),
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
        await SetAsync(EnforceDepartmentBudgetKey, dto.EnforceDepartmentBudget.ToString());
        await SetAsync(PrLguKey, dto.PrLgu?.Trim() ?? string.Empty);
        await SetAsync(PrDepartmentKey, dto.PrDepartment?.Trim() ?? string.Empty);
        await SetAsync(PrRequestedByNameKey, dto.PrRequestedByName?.Trim() ?? string.Empty);
        await SetAsync(PrRequestedByDesignationKey, dto.PrRequestedByDesignation?.Trim() ?? string.Empty);
        await SetAsync(PrCashAvailabilityNameKey, dto.PrCashAvailabilityName?.Trim() ?? string.Empty);
        await SetAsync(PrCashAvailabilityDesignationKey, dto.PrCashAvailabilityDesignation?.Trim() ?? string.Empty);
        await SetAsync(PrApproverNameKey, dto.PrApproverName?.Trim() ?? string.Empty);
        await SetAsync(PrApproverDesignationKey, dto.PrApproverDesignation?.Trim() ?? string.Empty);
        await SetAsync(LetterheadAddressKey, dto.LetterheadAddress?.Trim() ?? string.Empty);
        await SetAsync(LetterheadCertificationKey, dto.LetterheadCertification?.Trim() ?? string.Empty);
        await SetAsync(RisApprover1NameKey, dto.RisApprover1Name?.Trim() ?? string.Empty);
        await SetAsync(RisApprover1DesignationKey, dto.RisApprover1Designation?.Trim() ?? string.Empty);
        await SetAsync(RisApprover2NameKey, dto.RisApprover2Name?.Trim() ?? string.Empty);
        await SetAsync(RisApprover2DesignationKey, dto.RisApprover2Designation?.Trim() ?? string.Empty);
        await SetAsync(RisFormCodeKey, dto.RisFormCode?.Trim() ?? string.Empty);
        await SetAsync(RisRevisionNoKey, dto.RisRevisionNo?.Trim() ?? string.Empty);
        await SetAsync(RisRevisionDateKey, dto.RisRevisionDate?.Trim() ?? string.Empty);
        await _db.SaveChangesAsync();
        return await GetAsync();
    }

    public async Task<int> GetBackupRetentionDaysAsync()
    {
        var setting = await _db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == BackupRetentionKey);
        return int.TryParse(setting?.Value, out var d) ? d : DefaultRetentionDays;
    }

    // Used by DepartmentBudgetService when deciding whether an over-budget
    // purchase order is a hard stop or just a warning.
    public async Task<bool> GetEnforceDepartmentBudgetAsync()
    {
        var setting = await _db.SystemSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == EnforceDepartmentBudgetKey);
        return !bool.TryParse(setting?.Value, out var enforce) || enforce;
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
