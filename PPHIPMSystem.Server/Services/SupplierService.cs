using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.DTOs.Supplier;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class SupplierService : ISupplierService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public SupplierService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<SupplierDto>> GetAllAsync(string? search)
    {
        var query = _db.Suppliers.Include(s => s.PurchaseOrders).Where(s => s.IsActive).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Name.Contains(search) || (s.ContactPerson != null && s.ContactPerson.Contains(search)));
        var items = await query.ToListAsync();
        return _mapper.Map<IEnumerable<SupplierDto>>(items);
    }

    public async Task<SupplierDto?> GetByIdAsync(int id)
    {
        var item = await _db.Suppliers.Include(s => s.PurchaseOrders).FirstOrDefaultAsync(s => s.Id == id && s.IsActive);
        return item is null ? null : _mapper.Map<SupplierDto>(item);
    }

    public async Task<SupplierDto> CreateAsync(CreateSupplierDto dto)
    {
        var entity = _mapper.Map<Supplier>(dto);
        _db.Suppliers.Add(entity);
        await _db.SaveChangesAsync();
        return _mapper.Map<SupplierDto>(entity);
    }

    public async Task<SupplierDto?> UpdateAsync(int id, CreateSupplierDto dto)
    {
        var entity = await _db.Suppliers.FindAsync(id);
        if (entity is null) return null;
        _mapper.Map(dto, entity);
        await _db.SaveChangesAsync();
        await _db.Entry(entity).Collection(e => e.PurchaseOrders).LoadAsync();
        return _mapper.Map<SupplierDto>(entity);
    }

    public async Task<bool> UpdateAccreditationAsync(int id, bool isAccredited, DateTime? expiry)
    {
        var entity = await _db.Suppliers.FindAsync(id);
        if (entity is null) return false;
        entity.IsAccredited = isAccredited;
        entity.AccreditationExpiry = expiry;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.Suppliers.FindAsync(id);
        if (entity is null) return false;
        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<PurchaseOrderDto>> GetOrdersAsync(int supplierId)
    {
        var orders = await _db.PurchaseOrders
            .Include(po => po.ProcurementRequest)
            .Include(po => po.GeneratedByUser)
            .Include(po => po.Items).ThenInclude(i => i.InventoryItem)
            .Where(po => po.SupplierId == supplierId)
            .OrderByDescending(po => po.GeneratedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<PurchaseOrderDto>>(orders);
    }
}
