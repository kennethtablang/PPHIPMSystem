using PPHIPMSystem.Server.DTOs.StockAdjustment;

namespace PPHIPMSystem.Server.Interfaces;

public interface IStockAdjustmentService
{
    Task<IEnumerable<StockAdjustmentDto>> GetAllAsync(string? status);
    Task<StockAdjustmentDto?> GetByIdAsync(int id);
    Task<StockAdjustmentDto> CreateAsync(CreateStockAdjustmentDto dto, string userId);
    Task<StockAdjustmentDto?> ProcessApprovalAsync(int id, ApproveAdjustmentDto dto, string approverId);
}
