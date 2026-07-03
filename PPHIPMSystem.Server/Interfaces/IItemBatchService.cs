using PPHIPMSystem.Server.DTOs.Batch;

namespace PPHIPMSystem.Server.Interfaces;

public interface IItemBatchService
{
    Task<IEnumerable<ItemBatchDto>> GetAllAsync();
    Task<IEnumerable<ItemBatchDto>> GetByItemAsync(int inventoryItemId);
    Task<IEnumerable<ItemBatchDto>> GetExpiringAsync(int? warningDays);
    Task<ItemBatchDto> CreateAsync(CreateItemBatchDto dto, string userId);
    Task<ItemBatchDto?> UpdateDetailsAsync(int batchId, UpdateItemBatchDetailsDto dto, string userId);
    Task<bool> MarkExpiredForDisposalAsync(int batchId, string userId, string reason);
    Task<BulkDisposalResultDto> DisposeExpiredAsync(string reason, string userId);
}
