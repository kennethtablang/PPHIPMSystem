using PPHIPMSystem.Server.DTOs.Department;

namespace PPHIPMSystem.Server.Interfaces;

public interface IDepartmentService
{
    Task<IEnumerable<DepartmentDto>> GetAllAsync();
    Task<DepartmentDto?> GetByIdAsync(int id);
    Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto);
    Task<DepartmentDto?> UpdateAsync(int id, CreateDepartmentDto dto);
    Task<bool> DeleteAsync(int id);
}
