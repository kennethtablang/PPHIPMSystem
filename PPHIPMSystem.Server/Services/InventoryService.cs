using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Inventory;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notifications;

    public InventoryService(ApplicationDbContext db, IMapper mapper, INotificationService notifications)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
    }

    public async Task<IEnumerable<InventoryItemDto>> GetAllAsync(string? search, int? categoryId, bool? lowStock)
    {
        var query = _db.InventoryItems
            .Include(i => i.Category)
            .Include(i => i.Batches)
            .Where(i => i.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(i => i.Name.Contains(search) || (i.ItemCode != null && i.ItemCode.Contains(search)));

        if (categoryId.HasValue)
            query = query.Where(i => i.CategoryId == categoryId.Value);

        if (lowStock == true)
            query = query.Where(i => i.QuantityOnHand <= i.ReorderThreshold);

        var items = await query.ToListAsync();
        return _mapper.Map<IEnumerable<InventoryItemDto>>(items);
    }

    public async Task<InventoryItemDto?> GetByIdAsync(int id)
    {
        var item = await _db.InventoryItems
            .Include(i => i.Category)
            .Include(i => i.Batches)
            .FirstOrDefaultAsync(i => i.Id == id && i.IsActive);
        return item is null ? null : _mapper.Map<InventoryItemDto>(item);
    }

    public async Task<InventoryItemDto> CreateAsync(CreateInventoryItemDto dto)
    {
        var entity = _mapper.Map<InventoryItem>(dto);
        _db.InventoryItems.Add(entity);
        await _db.SaveChangesAsync();
        await _db.Entry(entity).Reference(e => e.Category).LoadAsync();
        return _mapper.Map<InventoryItemDto>(entity);
    }

    public async Task<InventoryItemDto?> UpdateAsync(int id, UpdateInventoryItemDto dto)
    {
        var entity = await _db.InventoryItems.FindAsync(id);
        if (entity is null) return null;
        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(entity).Reference(e => e.Category).LoadAsync();
        await _db.Entry(entity).Collection(e => e.Batches).LoadAsync();
        return _mapper.Map<InventoryItemDto>(entity);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _db.InventoryItems.FindAsync(id);
        if (entity is null) return false;
        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(string userId)
    {
        var now = DateTime.UtcNow;

        var items = await _db.InventoryItems
            .Include(i => i.Batches)
            .Include(i => i.Category)
            .Where(i => i.IsActive)
            .ToListAsync();

        var lowStockItems = items.Where(i => i.QuantityOnHand <= i.ReorderThreshold).ToList();

        var expiringBatches = items
            .SelectMany(i => i.Batches.Where(b =>
                b.ExpirationDate.HasValue &&
                b.RemainingQuantity > 0 &&
                b.ExpirationDate.Value > now &&
                (b.ExpirationDate.Value - now).TotalDays <= i.ExpirationWarningDays))
            .ToList();

        var expiredCount = items
            .SelectMany(i => i.Batches.Where(b =>
                b.ExpirationDate.HasValue && b.ExpirationDate.Value.Date < now.Date && b.RemainingQuantity > 0))
            .Count();

        var pendingProcurement = await _db.ProcurementRequests
            .CountAsync(r => r.Status != Models.Enums.ProcurementStatus.Delivered &&
                             r.Status != Models.Enums.ProcurementStatus.Cancelled &&
                             r.Status != Models.Enums.ProcurementStatus.FullyApproved &&
                             r.Status != Models.Enums.ProcurementStatus.PurchaseOrderGenerated);

        var pendingAdjustments = await _db.StockAdjustments
            .CountAsync(a => a.Status == Models.Enums.AdjustmentStatus.Pending);

        var unread = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

        var recentMovements = await _db.StockMovements
            .Include(m => m.PerformedByUser)
            .Include(m => m.InventoryItem)
            .OrderByDescending(m => m.MovementDate)
            .Take(10)
            .ToListAsync();

        return new DashboardSummaryDto
        {
            TotalItems = items.Count,
            LowStockCount = lowStockItems.Count,
            ExpiringItemCount = expiringBatches.Count,
            ExpiredItemCount = expiredCount,
            PendingProcurementRequests = pendingProcurement,
            PendingStockAdjustments = pendingAdjustments,
            UnreadNotifications = unread,
            LowStockItems = lowStockItems.Select(i => new LowStockAlertDto
            {
                ItemId = i.Id,
                ItemName = i.Name,
                ItemCode = i.ItemCode,
                QuantityOnHand = i.QuantityOnHand,
                ReorderThreshold = i.ReorderThreshold,
                Unit = i.Unit,
                CategoryName = i.Category?.Name ?? ""
            }),
            ExpiringBatches = expiringBatches.Select(b => new ExpiringBatchAlertDto
            {
                BatchId = b.Id,
                ItemId = b.InventoryItemId,
                ItemName = b.InventoryItem?.Name ?? "",
                LotNumber = b.LotNumber,
                RemainingQuantity = b.RemainingQuantity,
                ExpirationDate = b.ExpirationDate!.Value,
                DaysUntilExpiry = (int)(b.ExpirationDate.Value - now).TotalDays
            }),
            RecentTransactions = recentMovements.Select(m => new RecentTransactionDto
            {
                TransactionType = m.MovementType.ToString(),
                Description = $"{m.MovementType} of {m.Quantity} {m.InventoryItem?.Name}",
                PerformedBy = $"{m.PerformedByUser?.FirstName} {m.PerformedByUser?.LastName}",
                Timestamp = m.MovementDate,
                ReferenceId = m.Id,
                InventoryItemId = m.InventoryItemId,
                InventoryItemName = m.InventoryItem?.Name,
                Quantity = m.Quantity,
                Unit = m.InventoryItem?.Unit
            })
        };
    }
}
