using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Report;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

// Nightly housekeeping: purges old notifications/audit logs per the retention
// settings, and on the 1st of each month emails administrators a summary of
// the previous month (when enabled in Settings → System).
public class MaintenanceSchedulerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MaintenanceSchedulerService> _logger;
    private DateOnly? _lastCleanupDate;

    public MaintenanceSchedulerService(IServiceScopeFactory scopeFactory, ILogger<MaintenanceSchedulerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MaintenanceSchedulerService running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in maintenance scheduler tick.");
            }

            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }
    }

    private async Task TickAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        if (_lastCleanupDate == today) return;
        _lastCleanupDate = today;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var settings = await scope.ServiceProvider.GetRequiredService<ISystemSettingsService>().GetAsync();

        await RunRetentionCleanupAsync(db, settings.NotificationRetentionDays, settings.AuditLogRetentionDays);

        if (settings.MonthlyReportEmails)
            await SendMonthlyReportIfDueAsync(scope.ServiceProvider, db);
    }

    private async Task RunRetentionCleanupAsync(ApplicationDbContext db, int notificationDays, int auditDays)
    {
        if (notificationDays > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-notificationDays);
            var removed = await db.Notifications.Where(n => n.CreatedAt < cutoff).ExecuteDeleteAsync();
            if (removed > 0) _logger.LogInformation("Retention: deleted {Count} notification(s) older than {Days} days.", removed, notificationDays);
        }

        if (auditDays > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-auditDays);
            var removed = await db.AuditLogs.Where(l => l.Timestamp < cutoff).ExecuteDeleteAsync();
            if (removed > 0) _logger.LogInformation("Retention: deleted {Count} audit log(s) older than {Days} days.", removed, auditDays);
        }

        // Refresh tokens are worthless 30 days after expiring or being rotated out.
        var tokenCutoff = DateTime.UtcNow.AddDays(-30);
        var tokensRemoved = await db.RefreshTokens
            .Where(t => t.ExpiresAt < tokenCutoff || (t.RevokedAt != null && t.RevokedAt < tokenCutoff))
            .ExecuteDeleteAsync();
        if (tokensRemoved > 0) _logger.LogInformation("Retention: deleted {Count} dead refresh token(s).", tokensRemoved);
    }

    private async Task SendMonthlyReportIfDueAsync(IServiceProvider services, ApplicationDbContext db)
    {
        var now = DateTime.Now;
        if (now.Day != 1) return; // reports go out on the 1st, covering the prior month

        var thisMonth = now.ToString("yyyy-MM");
        var marker = await db.SystemSettings.FindAsync(SystemSettingsService.MonthlyReportLastSentKey);
        if (marker?.Value == thisMonth) return; // already sent (survives restarts)

        var prior = now.AddMonths(-1);
        var monthStart = new DateTime(prior.Year, prior.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var reports = services.GetRequiredService<IReportService>();
        var consumption = await reports.GetConsumptionReportAsync(new ReportFilterDto { Year = prior.Year });
        var monthQty = consumption.ByMonth.FirstOrDefault(m => m.Month == prior.Month)?.TotalQuantity ?? 0;
        var procurement = await reports.GetProcurementReportAsync(new ReportFilterDto { StartDate = monthStart, EndDate = monthEnd });
        var lowStockCount = await db.InventoryItems.CountAsync(i => i.IsActive && i.QuantityOnHand <= i.ReorderThreshold);

        var recipients = await db.Users.AsNoTracking()
            .Where(u => u.IsActive && u.EmailNotificationsEnabled && u.Email != null
                        && (u.Role == UserRole.HospitalAdministrator || u.Role == UserRole.SuperAdmin))
            .Select(u => u.Email!)
            .Distinct()
            .ToListAsync();

        if (recipients.Count == 0)
        {
            _logger.LogWarning("Monthly report enabled but no administrator has an email address with notifications on.");
            return;
        }

        var monthLabel = monthStart.ToString("MMMM yyyy");
        var body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 6px;'>
                <h2 style='color: #1a6a36;'>PPH IPMS — Monthly Summary for {monthLabel}</h2>
                <table style='width:100%; border-collapse: collapse; font-size: 14px;'>
                    <tr><td style='padding:6px 0; color:#555;'>Total quantity consumed</td><td style='text-align:right; font-weight:bold;'>{monthQty:N2}</td></tr>
                    <tr><td style='padding:6px 0; color:#555;'>Procurement requests filed</td><td style='text-align:right; font-weight:bold;'>{procurement.TotalRequests}</td></tr>
                    <tr><td style='padding:6px 0; color:#555;'>Fully approved</td><td style='text-align:right; font-weight:bold;'>{procurement.FullyApproved}</td></tr>
                    <tr><td style='padding:6px 0; color:#555;'>Purchase orders (delivered / total)</td><td style='text-align:right; font-weight:bold;'>{procurement.DeliveredPOs} / {procurement.TotalPOs}</td></tr>
                    <tr><td style='padding:6px 0; color:#555;'>Total PO amount</td><td style='text-align:right; font-weight:bold;'>PHP {procurement.TotalPOAmount:N2}</td></tr>
                    <tr><td style='padding:6px 0; color:#555;'>Items currently at/below reorder level</td><td style='text-align:right; font-weight:bold;'>{lowStockCount}</td></tr>
                </table>
                <p style='font-size:12px; color:#888; margin-top:16px;'>
                    Full reports with charts and Excel export are available in the system under Reports.
                    This email was sent automatically because monthly report emails are enabled in Settings → System.
                </p>
            </div>";

        var email = services.GetRequiredService<IEmailService>();
        foreach (var to in recipients)
            await email.SendEmailAsync(to, $"IPMS Monthly Summary — {monthLabel}", body);

        if (marker is null)
            db.SystemSettings.Add(new SystemSetting { Key = SystemSettingsService.MonthlyReportLastSentKey, Value = thisMonth });
        else
            marker.Value = thisMonth;
        await db.SaveChangesAsync();

        _logger.LogInformation("Monthly summary for {Month} emailed to {Count} administrator(s).", monthLabel, recipients.Count);
    }
}
