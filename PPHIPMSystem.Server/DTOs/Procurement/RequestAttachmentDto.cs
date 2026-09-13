namespace PPHIPMSystem.Server.DTOs.Procurement;

public class RequestAttachmentDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
    public string UploadedByFullName { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
