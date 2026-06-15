using PPHIPMSystem.Server.DTOs.Supplier;

namespace PPHIPMSystem.Server.Interfaces;

public interface ISupplierService
{
    Task<IEnumerable<SupplierDto>> GetAllAsync(string? search);
    Task<SupplierDto?> GetByIdAsync(int id);
    Task<SupplierDto> CreateAsync(CreateSupplierDto dto);
    Task<SupplierDto?> UpdateAsync(int id, CreateSupplierDto dto);
    Task<bool> UpdateAccreditationAsync(int id, bool isAccredited, DateTime? expiry);
    Task<bool> DeleteAsync(int id);
}
