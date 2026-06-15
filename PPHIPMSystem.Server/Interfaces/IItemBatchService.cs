using PPHIPMSystem.Server.DTOs.Batch;

namespace PPHIPMSystem.Server.Interfaces;

public interface IItemBatchService
{
    Task<IEnumerable<ItemBatchDto>> GetByItemAsync(int inventoryItemId);
    Task<IEnumerable<ItemBatchDto>> GetExpiringAsync(int? warningDays);
    Task<ItemBatchDto> CreateAsync(CreateItemBatchDto dto, string userId);
    Task<bool> MarkExpiredForDisposalAsync(int batchId, string userId);
}
