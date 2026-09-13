using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

// Stores supporting documents for procurement requests on disk (random file
// names, whitelisted types, size-capped) with metadata in the database.
public class RequestAttachmentService : IRequestAttachmentService
{
    private const long MaxFileBytes = 10 * 1024 * 1024; // 10 MB
    private const int MaxPerRequest = 10;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".xlsx", ".xls", ".docx", ".doc"
    };

    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IAuditLogService _audit;

    public RequestAttachmentService(ApplicationDbContext db, IWebHostEnvironment env, IAuditLogService audit)
    {
        _db = db;
        _env = env;
        _audit = audit;
    }

    private string UploadDirectory
    {
        get
        {
            var dir = Path.Combine(_env.ContentRootPath, "Uploads", "procurement");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public async Task<IEnumerable<RequestAttachmentDto>> GetForRequestAsync(int requestId)
    {
        var items = await _db.RequestAttachments.AsNoTracking()
            .Include(a => a.UploadedByUser)
            .Where(a => a.ProcurementRequestId == requestId)
            .OrderBy(a => a.UploadedAt)
            .ToListAsync();
        return items.Select(ToDto);
    }

    public async Task<RequestAttachmentDto> UploadAsync(int requestId, IFormFile file, string userId)
    {
        _ = await _db.ProcurementRequests.FindAsync(requestId)
            ?? throw new InvalidOperationException("Request not found.");

        if (file.Length == 0)
            throw new InvalidOperationException("The file is empty.");
        if (file.Length > MaxFileBytes)
            throw new InvalidOperationException("Files are limited to 10 MB.");

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException(
                $"File type \"{extension}\" is not allowed. Use PDF, images, or Office documents.");

        // Content-Type is derived from the validated extension — the client's
        // header is never stored or served back (MIME-confusion defense).
        var contentType = extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls" => "application/vnd.ms-excel",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc" => "application/msword",
            _ => "application/octet-stream",
        };

        var count = await _db.RequestAttachments.CountAsync(a => a.ProcurementRequestId == requestId);
        if (count >= MaxPerRequest)
            throw new InvalidOperationException($"A request can hold at most {MaxPerRequest} attachments.");

        // Random stored name: never trust the client's file name on disk.
        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(UploadDirectory, storedName);
        await using (var stream = File.Create(fullPath))
            await file.CopyToAsync(stream);

        var attachment = new RequestAttachment
        {
            ProcurementRequestId = requestId,
            FileName = Path.GetFileName(file.FileName),
            StoredFileName = storedName,
            ContentType = contentType,
            FileSizeBytes = file.Length,
            UploadedByUserId = userId,
        };
        _db.RequestAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "AttachmentUploaded", "ProcurementRequest", requestId,
            $"File: {attachment.FileName} ({attachment.FileSizeBytes / 1024} KB)");

        await _db.Entry(attachment).Reference(a => a.UploadedByUser).LoadAsync();
        return ToDto(attachment);
    }

    public async Task<(byte[] Content, string FileName, string ContentType)?> DownloadAsync(int attachmentId)
    {
        var attachment = await _db.RequestAttachments.FindAsync(attachmentId);
        if (attachment is null) return null;

        var fullPath = Path.Combine(UploadDirectory, attachment.StoredFileName);
        if (!File.Exists(fullPath)) return null;

        var bytes = await File.ReadAllBytesAsync(fullPath);
        var contentType = string.IsNullOrEmpty(attachment.ContentType)
            ? "application/octet-stream"
            : attachment.ContentType;
        return (bytes, attachment.FileName, contentType);
    }

    public async Task<bool> DeleteAsync(int attachmentId, string userId, bool isAdmin)
    {
        var attachment = await _db.RequestAttachments.FindAsync(attachmentId);
        if (attachment is null) return false;

        if (!isAdmin && attachment.UploadedByUserId != userId)
            throw new InvalidOperationException("Only the uploader or an administrator can remove this attachment.");

        try
        {
            var fullPath = Path.Combine(UploadDirectory, attachment.StoredFileName);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        catch { /* orphaned file is harmless; the metadata row is what matters */ }

        _db.RequestAttachments.Remove(attachment);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "AttachmentDeleted", "ProcurementRequest", attachment.ProcurementRequestId,
            $"File: {attachment.FileName}");
        return true;
    }

    public Task<bool> RequestBelongsToDepartmentAsync(int requestId, int departmentId) =>
        _db.ProcurementRequests.AsNoTracking()
            .AnyAsync(r => r.Id == requestId && r.DepartmentId == departmentId);

    public async Task<int?> GetRequestIdForAttachmentAsync(int attachmentId)
    {
        var attachment = await _db.RequestAttachments.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == attachmentId);
        return attachment?.ProcurementRequestId;
    }

    private static RequestAttachmentDto ToDto(RequestAttachment a) => new()
    {
        Id = a.Id,
        FileName = a.FileName,
        ContentType = a.ContentType,
        FileSizeBytes = a.FileSizeBytes,
        UploadedByUserId = a.UploadedByUserId,
        UploadedByFullName = a.UploadedByUser is null ? "" : $"{a.UploadedByUser.FirstName} {a.UploadedByUser.LastName}",
        UploadedAt = a.UploadedAt,
    };
}
