using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class ExpirationCheckService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpirationCheckService> _logger;

    public ExpirationCheckService(IServiceProvider serviceProvider, ILogger<ExpirationCheckService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpirationCheckService running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckExpirationsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while checking expirations.");
            }

            // Check every 24 hours
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task CheckExpirationsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var today = DateTime.UtcNow.Date;
        var todayEnd = today.AddDays(1);

        // Collect batch IDs already notified today to avoid duplicate flood notifications
        var alreadyNotifiedBatchIds = await db.Notifications
            .Where(n => n.Type == NotificationType.ExpirationWarning
                     && n.ReferenceType == "ItemBatch"
                     && n.CreatedAt >= today
                     && n.CreatedAt < todayEnd
                     && n.ReferenceId != null)
            .Select(n => n.ReferenceId!.Value)
            .Distinct()
            .ToListAsync();

        var alreadyNotifiedSet = new HashSet<int>(alreadyNotifiedBatchIds);

        var expiringBatches = await db.ItemBatches
            .Include(b => b.InventoryItem)
            .Where(b => b.RemainingQuantity > 0 && b.ExpirationDate.HasValue)
            .ToListAsync();

        int notified = 0;
        foreach (var batch in expiringBatches)
        {
            // Skip if we already sent a notification for this batch today
            if (alreadyNotifiedSet.Contains(batch.Id)) continue;

            var expDate = batch.ExpirationDate!.Value.Date;
            var warningDays = batch.InventoryItem.ExpirationWarningDays;
            var daysUntilExp = (expDate - today).TotalDays;

            string? title = null;
            string? message = null;

            if (daysUntilExp <= warningDays && daysUntilExp >= 0)
            {
                title = daysUntilExp == 0 ? "Item Expiring Today" : "Item Expiration Warning";
                message = $"{batch.InventoryItem.Name} (Lot {batch.LotNumber ?? "N/A"}) expires in {(int)daysUntilExp} day(s).";
            }
            else if (daysUntilExp < 0)
            {
                title = "Item Expired";
                message = $"{batch.InventoryItem.Name} (Lot {batch.LotNumber ?? "N/A"}) has expired.";
            }

            if (title != null && message != null)
            {
                await notifications.CreateForRoleAsync(UserRole.InventoryOfficer, NotificationType.ExpirationWarning, title, message, batch.Id, "ItemBatch");
                await notifications.CreateForRoleAsync(UserRole.HospitalAdministrator, NotificationType.ExpirationWarning, title, message, batch.Id, "ItemBatch");
                notified++;
            }
        }

        _logger.LogInformation("ExpirationCheckService: checked {Total} batches, sent {Notified} new notification(s).", expiringBatches.Count, notified);
    }
}
