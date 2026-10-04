using PPHIPMSystem.Server.DTOs.Inventory;

namespace PPHIPMSystem.Server.Interfaces;

public interface IInventoryDuplicateService
{
    Task<List<DuplicateGroupDto>> FindDuplicateGroupsAsync();
    Task<List<DuplicateItemDto>> FindSimilarAsync(string name, string? brand, string? unit, int? categoryId, int? excludeId);
    Task<MergeResultDto> MergeAsync(MergeItemsDto dto, string userId);
}
