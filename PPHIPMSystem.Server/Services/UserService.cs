using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.User;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly IAuditLogService _audit;

    public UserService(UserManager<ApplicationUser> userManager, ApplicationDbContext db, IMapper mapper, IAuditLogService audit)
    {
        _userManager = userManager;
        _db = db;
        _mapper = mapper;
        _audit = audit;
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync(string? search = null)
    {
        var query = _db.Users.Include(u => u.Department).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => (u.FirstName + " " + u.LastName).Contains(search) || u.UserName!.Contains(search));
        var users = await query.ToListAsync();
        return _mapper.Map<IEnumerable<UserDto>>(users);
    }

    public async Task<UserDto?> GetByIdAsync(string id)
    {
        var user = await _db.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? null : _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto)
    {
        var user = new ApplicationUser
        {
            EmployeeId = dto.EmployeeId,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            UserName = dto.UserName,
            Email = dto.Email,
            Role = dto.Role,
            DepartmentId = dto.DepartmentId,
            CreatedAt = DateTime.UtcNow
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        await _audit.LogAsync(null, "UserCreated", "User", null, $"Username: {user.UserName}");
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto?> UpdateAsync(string id, UpdateUserDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return null;

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        user.Role = dto.Role;
        user.DepartmentId = dto.DepartmentId;
        user.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(id, "UserUpdated", "User", null);

        var updated = await _db.Users.Include(u => u.Department).FirstAsync(u => u.Id == id);
        return _mapper.Map<UserDto>(updated);
    }

    public async Task<bool> DeactivateAsync(string id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;
        user.IsActive = false;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(id, "UserDeactivated", "User", null);
        return true;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;
        await _userManager.DeleteAsync(user);
        await _audit.LogAsync(null, "UserDeleted", "User", null, $"UserId: {id}");
        return true;
    }

    public async Task<ProfileDto?> GetProfileAsync(string id)
    {
        var user = await _db.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return null;

        return new ProfileDto
        {
            Id = user.Id,
            Username = user.UserName!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email ?? "",
            Role = user.Role.ToString(),
            DepartmentName = user.Department?.Name,
            TwoFactorEnabled = user.TwoFactorEnabled
        };
    }

    public async Task<ProfileDto?> UpdateProfileAsync(string id, UpdateProfileDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return null;

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        
        var emailResult = await _userManager.SetEmailAsync(user, dto.Email);
        var twoFactorResult = await _userManager.SetTwoFactorEnabledAsync(user, dto.TwoFactorEnabled);

        await _db.SaveChangesAsync();
        await _audit.LogAsync(id, "ProfileUpdated", "User", null);

        return await GetProfileAsync(id);
    }
}
