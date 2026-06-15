using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Department;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class DepartmentService : IDepartmentService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public DepartmentService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<DepartmentDto>> GetAllAsync()
    {
        var items = await _db.Departments.Include(d => d.Users).ToListAsync();
        return _mapper.Map<IEnumerable<DepartmentDto>>(items);
    }

    public async Task<DepartmentDto?> GetByIdAsync(int id)
    {
        var item = await _db.Departments.Include(d => d.Users).FirstOrDefaultAsync(d => d.Id == id);
        return item is null ? null : _mapper.Map<DepartmentDto>(item);
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto)
    {
        var entity = _mapper.Map<Department>(dto);
        _db.Departments.Add(entity);
        await _db.SaveChangesAsync();
        return _mapper.Map<DepartmentDto>(entity);
    }

    public async Task<DepartmentDto?> UpdateAsync(int id, CreateDepartmentDto dto)
    {
        var entity = await _db.Departments.FindAsync(id);
        if (entity is null) return null;
        entity.Name = dto.Name;
        entity.Description = dto.Description;
        await _db.SaveChangesAsync();
        return _mapper.Map<DepartmentDto>(entity);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Departments.FindAsync(id);
        if (entity is null) return false;
        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }
}
