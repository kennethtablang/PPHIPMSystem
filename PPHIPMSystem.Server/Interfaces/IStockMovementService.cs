using PPHIPMSystem.Server.DTOs.StockMovement;

namespace PPHIPMSystem.Server.Interfaces;

public interface IStockMovementService
{
    Task<IEnumerable<StockMovementDto>> GetAllAsync(int? itemId, DateTime? from, DateTime? to);
    Task<StockMovementDto> CreateAsync(CreateStockMovementDto dto, string userId);
}
