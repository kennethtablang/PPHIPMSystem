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

    public async Task<IEnumerable<ItemBatchDto>> GetAllAsync()
    {
        var batches = await _db.ItemBatches
            .Include(b => b.InventoryItem)
            .Include(b => b.PurchaseOrder)
            .Where(b => b.RemainingQuantity > 0)
            .OrderBy(b => b.ExpirationDate)
            .ToListAsync();
        return _mapper.Map<IEnumerable<ItemBatchDto>>(batches);
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
        if (dto.PurchaseOrderId.HasValue &&
            await _db.PurchaseOrders.FindAsync(dto.PurchaseOrderId.Value) is null)
            throw new InvalidOperationException("Purchase order not found.");

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
        await _notifications.BroadcastStockChangedAsync();
        return _mapper.Map<ItemBatchDto>(entity);
    }

    // Replenish several items in one action. Every line is validated up front and
    // the inserts plus the QuantityOnHand increases go out in a single
    // SaveChangesAsync, so a bad line on row 12 cannot leave rows 1-11 applied.
    public async Task<BulkReceiveResultDto> ReceiveManyAsync(BulkReceiveBatchesDto dto, string userId)
    {
        if (dto.Batches.Count == 0)
            throw new InvalidOperationException("No lines to receive.");

        var itemIds = dto.Batches.Select(b => b.InventoryItemId).Distinct().ToList();
        var items = await _db.InventoryItems
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var missingItems = itemIds.Where(id => !items.ContainsKey(id)).ToList();
        if (missingItems.Count > 0)
            throw new InvalidOperationException($"Item(s) not found: {string.Join(", ", missingItems)}.");

        var poIds = dto.Batches
            .Where(b => b.PurchaseOrderId.HasValue)
            .Select(b => b.PurchaseOrderId!.Value).Distinct().ToList();
        if (poIds.Count > 0)
        {
            var knownPoIds = await _db.PurchaseOrders
                .Where(p => poIds.Contains(p.Id)).Select(p => p.Id).ToListAsync();
            var missingPos = poIds.Except(knownPoIds).ToList();
            if (missingPos.Count > 0)
                throw new InvalidOperationException($"Purchase order(s) not found: {string.Join(", ", missingPos)}.");
        }

        var created = new List<(ItemBatch Batch, InventoryItem Item, CreateItemBatchDto Line)>();
        foreach (var line in dto.Batches)
        {
            var entity = _mapper.Map<ItemBatch>(line);
            _db.ItemBatches.Add(entity);

            var item = items[line.InventoryItemId];
            item.QuantityOnHand += line.Quantity;
            item.UpdatedAt = DateTime.UtcNow;

            created.Add((entity, item, line));
        }

        await _db.SaveChangesAsync();

        // One summary entry, matching how DisposeExpiredAsync records bulk work.
        // The per-line breakdown is kept in Details (capped to the column width).
        var breakdown = string.Join("; ", created.Select(c =>
            $"{c.Item.Name} ×{c.Line.Quantity}" +
            (string.IsNullOrWhiteSpace(c.Line.LotNumber) ? "" : $" (lot {c.Line.LotNumber})") +
            (c.Line.ExpirationDate.HasValue ? $" exp {c.Line.ExpirationDate:yyyy-MM-dd}" : "")));
        var summary = $"Bulk receive: {created.Count} batch(es), " +
                      $"{created.Sum(c => c.Line.Quantity)} unit(s). {breakdown}";
        if (summary.Length > 2000) summary = summary[..1997] + "…";

        await _audit.LogAsync(userId, "BatchesReceived", "ItemBatch", null, summary);

        // Same expiry warning the single-receive path raises, per line.
        foreach (var (batch, item, line) in created)
        {
            if (!line.ExpirationDate.HasValue) continue;
            var daysUntilExpiry = (line.ExpirationDate.Value - DateTime.UtcNow).TotalDays;
            if (daysUntilExpiry > item.ExpirationWarningDays) continue;

            await _notifications.CreateForRoleAsync(
                UserRole.InventoryOfficer,
                NotificationType.ExpirationWarning,
                "Expiration Warning",
                $"Batch {line.LotNumber ?? batch.Id.ToString()} of {item.Name} expires in {(int)daysUntilExpiry} days.",
                batch.Id, "ItemBatch");
        }

        await _notifications.BroadcastStockChangedAsync();

        return new BulkReceiveResultDto
        {
            BatchesCreated = created.Count,
            TotalQuantity = created.Sum(c => c.Line.Quantity),
        };
    }

    public async Task<ItemBatchDto?> UpdateDetailsAsync(int batchId, UpdateItemBatchDetailsDto dto, string userId)
    {
        var batch = await _db.ItemBatches.Include(b => b.InventoryItem).FirstOrDefaultAsync(b => b.Id == batchId);
        if (batch is null) return null;

        var oldLot = batch.LotNumber ?? "—";
        var oldExp = batch.ExpirationDate?.ToString("yyyy-MM-dd") ?? "—";

        batch.LotNumber = string.IsNullOrWhiteSpace(dto.LotNumber) ? null : dto.LotNumber.Trim();
        batch.ExpirationDate = dto.ExpirationDate;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "BatchCorrected", "ItemBatch", batch.Id,
            $"Item: {batch.InventoryItem.Name}, Lot: {oldLot} → {batch.LotNumber ?? "—"}, " +
            $"Expiry: {oldExp} → {batch.ExpirationDate?.ToString("yyyy-MM-dd") ?? "—"}");

        return _mapper.Map<ItemBatchDto>(batch);
    }

    public async Task<bool> MarkExpiredForDisposalAsync(int batchId, string userId, string reason)
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
            Remarks = $"Disposal — {reason}. Batch: {batch.LotNumber ?? batchId.ToString()}",
            PerformedByUserId = userId
        });

        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, "BatchDisposed", "ItemBatch", batchId,
            $"Disposed {disposalQty} of {item.Name}. Reason: {reason}. Batch: {batch.LotNumber ?? batchId.ToString()}");
        return true;
    }

    // Monthly pharmacy practice: write off everything past its expiration date
    // in one action. Each batch still gets its own Disposal movement so the
    // disposal certificate can list them individually.
    public async Task<BulkDisposalResultDto> DisposeExpiredAsync(string reason, string userId)
    {
        var today = DateTime.UtcNow.Date;
        var expired = await _db.ItemBatches
            .Include(b => b.InventoryItem)
            .Where(b => b.RemainingQuantity > 0 && b.ExpirationDate != null && b.ExpirationDate < today)
            .ToListAsync();

        var result = new BulkDisposalResultDto();
        foreach (var batch in expired)
        {
            var qty = batch.RemainingQuantity;
            batch.RemainingQuantity = 0;

            var item = batch.InventoryItem;
            item.QuantityOnHand = Math.Max(0, item.QuantityOnHand - qty);
            item.UpdatedAt = DateTime.UtcNow;

            _db.StockMovements.Add(new StockMovement
            {
                InventoryItemId = item.Id,
                MovementType = StockMovementType.Disposal,
                Quantity = qty,
                QuantityBeforeMovement = item.QuantityOnHand + qty,
                QuantityAfterMovement = item.QuantityOnHand,
                Remarks = $"Disposal — {reason}. Batch: {batch.LotNumber ?? batch.Id.ToString()}",
                PerformedByUserId = userId
            });

            result.BatchesDisposed++;
            result.TotalQuantity += qty;
        }

        if (result.BatchesDisposed > 0)
        {
            await _db.SaveChangesAsync();
            await _audit.LogAsync(userId, "ExpiredBatchesDisposed", "ItemBatch", null,
                $"Bulk-disposed {result.BatchesDisposed} expired batch(es), {result.TotalQuantity} unit(s) total. Reason: {reason}");
            await _notifications.BroadcastStockChangedAsync();
        }

        return result;
    }
}
