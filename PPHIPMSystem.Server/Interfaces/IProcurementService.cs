using PPHIPMSystem.Server.DTOs.Procurement;

namespace PPHIPMSystem.Server.Interfaces;

public interface IProcurementService
{
    Task<IEnumerable<ProcurementRequestDto>> GetAllAsync(string? status, int? departmentId, Models.Enums.RequestType? type = null);
    Task<ProcurementRequestDto?> GetByIdAsync(int id);
    Task<ProcurementRequestDto> CreateAsync(CreateProcurementRequestDto dto, string userId, int departmentId);
    Task<ProcurementRequestDto?> UpdateAsync(int id, UpdateProcurementRequestDto dto, string userId, int departmentId);
    Task<ProcurementRequestDto?> CancelAsync(int id, string? reason, string userId);
    Task<ProcurementRequestDto?> SubmitAsync(int id, string userId);
    Task<ProcurementRequestDto?> ReleaseAsync(int id, string userId);
    Task<IEnumerable<ItemAllocationDto>> GetAllocationOverviewAsync();
    Task SaveAllocationsAsync(SaveAllocationsDto dto, string userId);
    Task<ProcurementRequestDto?> ProcessApprovalAsync(int id, ApproveProcurementDto dto, string approverId);
    Task<PurchaseOrderDto> GeneratePurchaseOrderAsync(int requestId, GeneratePurchaseOrderDto dto, string userId);
    Task<PurchaseOrderDto?> GetPurchaseOrderAsync(int id);
    Task<IEnumerable<PurchaseOrderDto>> GetAllPurchaseOrdersAsync();
    Task<bool> ConfirmDeliveryAsync(int purchaseOrderId, ConfirmDeliveryDto? dto, string userId);
}
