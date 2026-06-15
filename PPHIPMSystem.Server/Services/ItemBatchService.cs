using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Batch;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class ItemBatchService : IItemBatchService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notifications;
    private readonly IAuditLogService _audit;

    public ItemBatchService(ApplicationDbContext db, IMapper mapper, INotificationService notifications, IAuditLogService audit)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
        _audit = audit;
    }

    public async Task<IEnumerable<ItemBatchDto>> GetByItemAsync(int inventoryItemId)
    {
        var batches = await _db.ItemBatches
            .Include(b => b.InventoryItem)
            .Include(b => b.PurchaseOrder)
            .Where(b => b.InventoryItemId == inventoryItemId)
            .OrderBy(b => b.ExpirationDate)
            .ToListAsync();
        return _mapper.Map<IEnumerable<ItemBatchDto>>(batches);
    }

    public async Task<IEnumerable<ItemBatchDto>> GetExpiringAsync(int? warningDays)
    {
        var days = warningDays ?? 30;
        var cutoff = DateTime.UtcNow.AddDays(days);
        var batches = await _db.ItemBatches
            .Include(b => b.InventoryItem)
            .Include(b => b.PurchaseOrder)
            .Where(b => b.ExpirationDate.HasValue && b.ExpirationDate.Value <= cutoff && b.RemainingQuantity > 0)
            .OrderBy(b => b.ExpirationDate)
            .ToListAsync();
        return _mapper.Map<IEnumerable<ItemBatchDto>>(batches);
    }

    public async Task<ItemBatchDto> CreateAsync(CreateItemBatchDto dto, string userId)
    {
        var entity = _mapper.Map<ItemBatch>(dto);
        _db.ItemBatches.Add(entity);

        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Item not found.");
        item.QuantityOnHand += dto.Quantity;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "BatchReceived", "ItemBatch", entity.Id,
            $"Item: {item.Name}, Qty: {dto.Quantity}, Lot: {dto.LotNumber}");

        if (dto.ExpirationDate.HasValue)
        {
            var daysUntilExpiry = (dto.ExpirationDate.Value - DateTime.UtcNow).TotalDays;
            if (daysUntilExpiry <= item.ExpirationWarningDays)
            {
                await _notifications.CreateForRoleAsync(
                    UserRole.InventoryOfficer,
                    NotificationType.ExpirationWarning,
                    "Expiration Warning",
                    $"Batch {dto.LotNumber ?? entity.Id.ToString()} of {item.Name} expires in {(int)daysUntilExpiry} days.",
                    entity.Id, "ItemBatch");
            }
        }

        await _db.Entry(entity).Reference(b => b.InventoryItem).LoadAsync();
        return _mapper.Map<ItemBatchDto>(entity);
    }

    public async Task<bool> MarkExpiredForDisposalAsync(int batchId, string userId)
    {
        var batch = await _db.ItemBatches.Include(b => b.InventoryItem).FirstOrDefaultAsync(b => b.Id == batchId);
        if (batch is null) return false;

        var disposalQty = batch.RemainingQuantity;
        batch.RemainingQuantity = 0;

        var item = batch.InventoryItem;
        item.QuantityOnHand = Math.Max(0, item.QuantityOnHand - disposalQty);
        item.UpdatedAt = DateTime.UtcNow;

        _db.StockMovements.Add(new StockMovement
        {
            InventoryItemId = item.Id,
            MovementType = StockMovementType.Disposal,
            Quantity = disposalQty,
            QuantityBeforeMovement = item.QuantityOnHand + disposalQty,
            QuantityAfterMovement = item.QuantityOnHand,
            Remarks = $"Expired batch {batch.LotNumber ?? batchId.ToString()} disposed",
            PerformedByUserId = userId
        });

        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, "BatchDisposed", "ItemBatch", batchId, $"Disposed {disposalQty} of {item.Name}");
        return true;
    }
}
