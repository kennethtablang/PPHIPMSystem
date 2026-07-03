using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

// Runs the daily backup at the admin-configured time (local server time).
// Checks once a minute; runs at most once per calendar day.
public class BackupSchedulerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackupSchedulerService> _logger;
    private DateOnly? _lastRunDate;

    public BackupSchedulerService(IServiceScopeFactory scopeFactory, ILogger<BackupSchedulerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BackupSchedulerService running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in backup scheduler tick.");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task TickAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var backups = scope.ServiceProvider.GetRequiredService<IBackupService>();

        var scheduled = await backups.GetScheduleTimeAsync();
        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);

        // Already ran today.
        if (_lastRunDate == today) return;

        // Match HH:mm (minute precision).
        if (now.ToString("HH:mm") != scheduled) return;

        _lastRunDate = today;
        _logger.LogInformation("Triggering scheduled daily backup at {Time}.", scheduled);
        await backups.CreateBackupAsync(BackupType.Scheduled, null);
    }
}
