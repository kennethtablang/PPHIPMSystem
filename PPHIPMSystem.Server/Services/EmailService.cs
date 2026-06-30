using System.Net;
using System.Net.Mail;
using PPHIPMSystem.Server.Interfaces;

namespace PPHIPMSystem.Server.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true)
    {
        var emailSettings = _config.GetSection("EmailSettings");
        var host = emailSettings["SmtpHost"];
        var port = int.Parse(emailSettings["SmtpPort"] ?? "587");
        var fromEmail = emailSettings["FromEmail"];
        var password = emailSettings["AppPassword"];
        var senderName = emailSettings["SenderName"];

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(fromEmail, password),
            EnableSsl = true
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(fromEmail!, senderName),
            Subject = subject,
            Body = body,
            IsBodyHtml = isHtml
        };

        mailMessage.To.Add(toEmail);

        try
        {
            await client.SendMailAsync(mailMessage);
            _logger.LogInformation("Email successfully sent to {ToEmail} with subject {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail}", toEmail);
            throw;
        }
    }
}
