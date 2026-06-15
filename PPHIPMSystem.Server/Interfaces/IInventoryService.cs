using PPHIPMSystem.Server.DTOs.Inventory;

namespace PPHIPMSystem.Server.Interfaces;

public interface IInventoryService
{
    Task<IEnumerable<InventoryItemDto>> GetAllAsync(string? search, int? categoryId, bool? lowStock);
    Task<InventoryItemDto?> GetByIdAsync(int id);
    Task<InventoryItemDto> CreateAsync(CreateInventoryItemDto dto);
    Task<InventoryItemDto?> UpdateAsync(int id, UpdateInventoryItemDto dto);
    Task<bool> DeleteAsync(int id);
    Task<DashboardSummaryDto> GetDashboardSummaryAsync(string userId);
}
