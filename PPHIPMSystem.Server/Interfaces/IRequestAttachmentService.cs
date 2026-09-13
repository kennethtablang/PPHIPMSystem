using Microsoft.AspNetCore.Http;
using PPHIPMSystem.Server.DTOs.Procurement;

namespace PPHIPMSystem.Server.Interfaces;

public interface IRequestAttachmentService
{
    Task<IEnumerable<RequestAttachmentDto>> GetForRequestAsync(int requestId);
    Task<RequestAttachmentDto> UploadAsync(int requestId, IFormFile file, string userId);
    Task<(byte[] Content, string FileName, string ContentType)?> DownloadAsync(int attachmentId);
    // Uploader may remove their own file; admins may remove any.
    Task<bool> DeleteAsync(int attachmentId, string userId, bool isAdmin);

    // Scope checks so department heads can only reach their own department's requests.
    Task<bool> RequestBelongsToDepartmentAsync(int requestId, int departmentId);
    Task<int?> GetRequestIdForAttachmentAsync(int attachmentId);
}
