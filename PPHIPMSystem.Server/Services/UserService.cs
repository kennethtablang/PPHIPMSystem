using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
    private readonly IMemoryCache _cache;

    public UserService(UserManager<ApplicationUser> userManager, ApplicationDbContext db, IMapper mapper, IAuditLogService audit, IMemoryCache cache)
    {
        _userManager = userManager;
        _db = db;
        _mapper = mapper;
        _audit = audit;
        _cache = cache;
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

    public async Task<UserDto> CreateAsync(CreateUserDto dto, string actorId)
    {
        var user = new ApplicationUser
        {
            EmployeeId = dto.EmployeeId,
            FirstName = dto.FirstName,
            MiddleName = dto.MiddleName,
            LastName = dto.LastName,
            UserName = dto.UserName,
            Email = dto.Email,
            Role = dto.Role,
            DepartmentId = dto.DepartmentId,
            CreatedAt = DateTime.UtcNow,
            // The admin picked this password — the user must set their own at first login.
            MustChangePassword = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        await _audit.LogAsync(actorId, "UserCreated", "User", null, $"Username: {user.UserName} (Role: {user.Role})");
        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto?> UpdateAsync(string id, UpdateUserDto dto, string actorId)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return null;

        var wasActive = user.IsActive;
        user.FirstName = dto.FirstName;
        user.MiddleName = dto.MiddleName;
        user.LastName = dto.LastName;
        user.Role = dto.Role;
        user.DepartmentId = dto.DepartmentId;
        user.IsActive = dto.IsActive;

        // Through UserManager so NormalizedEmail stays in sync (login-by-email,
        // forgot-password and 2FA lookups use it) and the unique-email rule runs.
        if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            ThrowIfFailed(await _userManager.SetEmailAsync(user, dto.Email));
        else
            ThrowIfFailed(await _userManager.UpdateAsync(user));

        // Evict the token-validation cache so a deactivation takes effect immediately.
        if (wasActive != user.IsActive) _cache.Remove($"user-active:{id}");

        await _audit.LogAsync(actorId, "UserUpdated", "User", null,
            $"Username: {user.UserName}, Role: {user.Role}, Active: {user.IsActive}");

        var updated = await _db.Users.Include(u => u.Department).FirstAsync(u => u.Id == id);
        return _mapper.Map<UserDto>(updated);
    }

    public async Task<bool> DeactivateAsync(string id, string actorId)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;
        user.IsActive = false;
        await _db.SaveChangesAsync();
        // Evict the token-validation cache so the user's existing JWT stops
        // working immediately, not after the cache TTL.
        _cache.Remove($"user-active:{id}");
        await _audit.LogAsync(actorId, "UserDeactivated", "User", null, $"Username: {user.UserName}");
        return true;
    }

    public async Task<bool> DeleteAsync(string id, string actorId)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return false;

        IdentityResult result;
        try
        {
            result = await _userManager.DeleteAsync(user);
        }
        catch (DbUpdateException)
        {
            // Requests, movements, approvals etc. reference the account.
            throw new InvalidOperationException(
                "This user has transaction history and cannot be deleted. Deactivate the account instead.");
        }
        ThrowIfFailed(result);

        _cache.Remove($"user-active:{id}");
        await _audit.LogAsync(actorId, "UserDeleted", "User", null, $"Username: {user.UserName}");
        return true;
    }

    private static void ThrowIfFailed(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
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
            TwoFactorEnabled = user.TwoFactorEnabled,
            HasAuthenticator = !string.IsNullOrEmpty(await _userManager.GetAuthenticatorKeyAsync(user)),
            EmailNotificationsEnabled = user.EmailNotificationsEnabled,
            EmailNotifyInventory = user.EmailNotifyInventory,
            EmailNotifyProcurement = user.EmailNotifyProcurement,
            EmailNotifyAdjustments = user.EmailNotifyAdjustments
        };
    }

    public async Task<ProfileDto?> UpdateProfileAsync(string id, UpdateProfileDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return null;

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.EmailNotificationsEnabled = dto.EmailNotificationsEnabled;
        user.EmailNotifyInventory = dto.EmailNotifyInventory;
        user.EmailNotifyProcurement = dto.EmailNotifyProcurement;
        user.EmailNotifyAdjustments = dto.EmailNotifyAdjustments;
        user.TwoFactorEnabled = dto.TwoFactorEnabled;

        // SetEmailAsync validates and normalizes; previously the raw value was
        // assigned first and saved even when validation failed.
        if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            ThrowIfFailed(await _userManager.SetEmailAsync(user, dto.Email));
        else
            ThrowIfFailed(await _userManager.UpdateAsync(user));

        await _audit.LogAsync(id, "ProfileUpdated", "User", null);

        return await GetProfileAsync(id);
    }
}
