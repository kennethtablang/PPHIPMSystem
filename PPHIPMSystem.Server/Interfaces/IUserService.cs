using PPHIPMSystem.Server.DTOs.User;

namespace PPHIPMSystem.Server.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllAsync(string? search = null);
    Task<UserDto?> GetByIdAsync(string id);
    Task<ProfileDto?> GetProfileAsync(string id);
    Task<UserDto> CreateAsync(CreateUserDto dto);
    Task<UserDto?> UpdateAsync(string id, UpdateUserDto dto);
    Task<ProfileDto?> UpdateProfileAsync(string id, UpdateProfileDto dto);
    Task<bool> DeactivateAsync(string id);
    Task<bool> DeleteAsync(string id);
}
