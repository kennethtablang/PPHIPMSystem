using System.Threading.Channels;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Services;

// Notification emails used to be sent inline: every approval, release or
// low-stock alert waited on a round trip to the SMTP server for each
// recipient (1–3 s apiece), which is what made saving feel laggy. They are
// now queued here and sent by EmailDispatchService in the background, so the
// request returns as soon as the database work is done.
public record QueuedEmail(string To, string Subject, string Body);

public interface IEmailQueue
{
    void Enqueue(QueuedEmail email);
    IAsyncEnumerable<QueuedEmail> ReadAllAsync(CancellationToken ct);
}

public class EmailQueue : IEmailQueue
{
    // Bounded so a mail outage can't grow memory without limit; the oldest
    // queued notice is dropped first (the in-app notification still exists).
    private readonly Channel<QueuedEmail> _channel = Channel.CreateBounded<QueuedEmail>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

    public void Enqueue(QueuedEmail email) => _channel.Writer.TryWrite(email);

    public IAsyncEnumerable<QueuedEmail> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public class EmailDispatchService : BackgroundService
{
    private readonly IEmailQueue _queue;
    private readonly IServiceScopeFactory _scopes;

    public EmailDispatchService(IEmailQueue queue, IServiceScopeFactory scopes)
    {
        _queue = queue;
        _scopes = scopes;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var email in _queue.ReadAllAsync(stoppingToken))
            {
                using var scope = _scopes.CreateScope();
                var sender = scope.ServiceProvider.GetRequiredService<IEmailService>();
                // EmailService logs and swallows its own failures.
                await sender.SendEmailAsync(email.To, email.Subject, email.Body);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down.
        }
    }
}
