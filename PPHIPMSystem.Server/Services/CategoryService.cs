using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Category;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public CategoryService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
        var items = await _db.Categories.Include(c => c.InventoryItems).ToListAsync();
        return _mapper.Map<IEnumerable<CategoryDto>>(items);
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        var item = await _db.Categories.Include(c => c.InventoryItems).FirstOrDefaultAsync(c => c.Id == id);
        return item is null ? null : _mapper.Map<CategoryDto>(item);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
    {
        var entity = _mapper.Map<Category>(dto);
        _db.Categories.Add(entity);
        await _db.SaveChangesAsync();
        return _mapper.Map<CategoryDto>(entity);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, CreateCategoryDto dto)
    {
        var entity = await _db.Categories.FindAsync(id);
        if (entity is null) return null;
        entity.Name = dto.Name;
        entity.Description = dto.Description;
        await _db.SaveChangesAsync();
        return _mapper.Map<CategoryDto>(entity);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Categories.FindAsync(id);
        if (entity is null) return false;
        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }
}
