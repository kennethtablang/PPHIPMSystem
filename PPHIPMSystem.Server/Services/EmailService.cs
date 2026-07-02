using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
        try
        {
            var host = _config["EmailSettings:SmtpHost"] ?? "smtp.gmail.com";
            var port = int.Parse(_config["EmailSettings:SmtpPort"] ?? "587");
            var username = _config["EmailSettings:FromEmail"] ?? "noreply.pphipsystem@gmail.com";
            var password = _config["EmailSettings:AppPassword"] ?? "gdjp bgqw lnil ynig";
            var displayName = _config["EmailSettings:SenderName"] ?? "PPH Inventory Procurement System";

            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = true
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(username, displayName),
                Subject = subject,
                Body = body,
                IsBodyHtml = isHtml
            };
            mailMessage.To.Add(toEmail);

            await client.SendMailAsync(mailMessage);
            _logger.LogInformation("Email sent successfully to {ToEmail}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {ToEmail}", toEmail);
        }
    }
}
