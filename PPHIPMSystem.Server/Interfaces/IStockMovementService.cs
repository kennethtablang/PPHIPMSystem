using PPHIPMSystem.Server.DTOs.StockMovement;

namespace PPHIPMSystem.Server.Interfaces;

public interface IStockMovementService
{
    Task<StockMovementPageDto> GetAllAsync(int? itemId, string? type, DateTime? from, DateTime? to, int page = 1, int pageSize = 50);
    Task<StockMovementDto> CreateAsync(CreateStockMovementDto dto, string userId);
    Task<StockMovementDto> VoidAsync(int movementId, string reason, string userId);
}
