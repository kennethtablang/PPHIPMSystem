using PPHIPMSystem.Server.DTOs.Procurement;

namespace PPHIPMSystem.Server.Interfaces;

public interface IProcurementService
{
    Task<IEnumerable<ProcurementRequestDto>> GetAllAsync(string? status, int? departmentId);
    Task<ProcurementRequestDto?> GetByIdAsync(int id);
    Task<ProcurementRequestDto> CreateAsync(CreateProcurementRequestDto dto, string userId, int departmentId);
    Task<ProcurementRequestDto?> SubmitAsync(int id, string userId);
    Task<ProcurementRequestDto?> ProcessApprovalAsync(int id, ApproveProcurementDto dto, string approverId);
    Task<PurchaseOrderDto> GeneratePurchaseOrderAsync(int requestId, GeneratePurchaseOrderDto dto, string userId);
    Task<PurchaseOrderDto?> GetPurchaseOrderAsync(int id);
    Task<IEnumerable<PurchaseOrderDto>> GetAllPurchaseOrdersAsync();
    Task<bool> ConfirmDeliveryAsync(int purchaseOrderId, string userId);
}
