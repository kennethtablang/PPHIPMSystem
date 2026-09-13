using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.Models;

// Supporting document on a procurement request (quotation, canvass sheet, …).
// The file lives on disk under Uploads/procurement; this row is the metadata.
public class RequestAttachment
{
    public int Id { get; set; }

    public int ProcurementRequestId { get; set; }
    public ProcurementRequest ProcurementRequest { get; set; } = null!;

    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;        // original name shown to users

    [MaxLength(100)]
    public string StoredFileName { get; set; } = string.Empty;  // random name on disk

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public string UploadedByUserId { get; set; } = string.Empty;
    public ApplicationUser UploadedByUser { get; set; } = null!;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
