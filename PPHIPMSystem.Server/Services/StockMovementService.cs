using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.StockMovement;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class StockMovementService : IStockMovementService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notifications;
    private readonly IAuditLogService _audit;

    public StockMovementService(ApplicationDbContext db, IMapper mapper, INotificationService notifications, IAuditLogService audit)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
        _audit = audit;
    }

    public async Task<IEnumerable<StockMovementDto>> GetAllAsync(int? itemId, DateTime? from, DateTime? to)
    {
        var query = _db.StockMovements
            .Include(m => m.InventoryItem)
            .Include(m => m.PerformedByUser)
            .Include(m => m.PurchaseOrder)
            .Include(m => m.VoidedByUser)
            .AsQueryable();

        if (itemId.HasValue) query = query.Where(m => m.InventoryItemId == itemId.Value);
        if (from.HasValue) query = query.Where(m => m.MovementDate >= from.Value);
        if (to.HasValue) query = query.Where(m => m.MovementDate <= to.Value);

        var items = await query.OrderByDescending(m => m.MovementDate).ToListAsync();
        return _mapper.Map<IEnumerable<StockMovementDto>>(items);
    }

    public async Task<StockMovementDto> CreateAsync(CreateStockMovementDto dto, string userId)
    {
        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Inventory item not found.");

        if (dto.PurchaseOrderId.HasValue &&
            await _db.PurchaseOrders.FindAsync(dto.PurchaseOrderId.Value) is null)
            throw new InvalidOperationException("Purchase order not found.");

        var before = item.QuantityOnHand;
        decimal after;

        switch (dto.MovementType)
        {
            case StockMovementType.Receipt:
            case StockMovementType.Return:
                after = before + dto.Quantity;
                break;
            case StockMovementType.Issuance:
            case StockMovementType.Disposal:
                if (dto.Quantity > before)
                    throw new InvalidOperationException("Insufficient stock.");
                after = before - dto.Quantity;
                await ConsumeBatchesFefoAsync(dto.InventoryItemId, dto.Quantity);
                break;
            default:
                // Adjustments go through the stock-adjustment approval flow,
                // not direct movements.
                throw new InvalidOperationException("Unsupported movement type.");
        }

        item.QuantityOnHand = after;
        item.UpdatedAt = DateTime.UtcNow;

        var movement = new StockMovement
        {
            InventoryItemId = dto.InventoryItemId,
            MovementType = dto.MovementType,
            Quantity = dto.Quantity,
            QuantityBeforeMovement = before,
            QuantityAfterMovement = after,
            Remarks = dto.Remarks,
            PerformedByUserId = userId,
            PurchaseOrderId = dto.PurchaseOrderId,
            MovementDate = DateTime.UtcNow
        };
        _db.StockMovements.Add(movement);

        if (dto.MovementType == StockMovementType.Issuance)
        {
            var now = DateTime.UtcNow;
            var (yr, mo) = (now.Year, now.Month);
            var record = await _db.ConsumptionRecords.FirstOrDefaultAsync(c =>
                c.InventoryItemId == dto.InventoryItemId && c.Year == yr && c.Month == mo);
            if (record is null)
            {
                _db.ConsumptionRecords.Add(new ConsumptionRecord
                {
                    InventoryItemId = dto.InventoryItemId,
                    Year = yr,
                    Month = mo,
                    QuantityConsumed = dto.Quantity
                });
            }
            else
            {
                record.QuantityConsumed += dto.Quantity;
            }
        }

        await _db.SaveChangesAsync();

        if (after <= item.ReorderThreshold)
        {
            await _notifications.CreateForRoleAsync(
                UserRole.InventoryOfficer,
                NotificationType.LowStock,
                "Low Stock Alert",
                $"{item.Name} is at {after} {item.Unit}, below reorder threshold of {item.ReorderThreshold}.",
                item.Id, "InventoryItem");
        }

        await _audit.LogAsync(userId, $"StockMovement_{dto.MovementType}", "StockMovement", movement.Id,
            $"Item: {item.Name}, Qty: {dto.Quantity}");
        await _notifications.BroadcastStockChangedAsync();

        await _db.Entry(movement).Reference(m => m.InventoryItem).LoadAsync();
        await _db.Entry(movement).Reference(m => m.PerformedByUser).LoadAsync();
        return _mapper.Map<StockMovementDto>(movement);
    }

    public async Task<StockMovementDto> VoidAsync(int movementId, string reason, string userId)
    {
        var original = await _db.StockMovements
            .Include(m => m.InventoryItem)
            .FirstOrDefaultAsync(m => m.Id == movementId)
            ?? throw new InvalidOperationException("Stock movement not found.");

        if (original.IsVoided)
            throw new InvalidOperationException("This movement has already been voided.");
        if (original.ReversalOfMovementId.HasValue)
            throw new InvalidOperationException("A reversal entry cannot itself be voided.");
        if (original.PurchaseOrderId.HasValue)
            throw new InvalidOperationException(
                "PO-linked movements can't be voided here — correct them through the delivery flow.");

        var item = original.InventoryItem;
        var qty = original.Quantity;
        var before = item.QuantityOnHand;
        decimal after;

        switch (original.MovementType)
        {
            case StockMovementType.Receipt:
            case StockMovementType.Return:
                // Original added stock; reversing removes it. Guard against the
                // stock having since been drawn down below what we must claw back.
                if (qty > before)
                    throw new InvalidOperationException(
                        "Can't void: on-hand stock has since dropped below the quantity to reverse.");
                after = before - qty;
                break;
            case StockMovementType.Issuance:
            case StockMovementType.Disposal:
                // Original removed stock and consumed batches; reversing restores both.
                after = before + qty;
                await RestoreBatchesFefoAsync(original.InventoryItemId, qty);
                break;
            default:
                throw new InvalidOperationException("This movement type can't be voided.");
        }

        item.QuantityOnHand = after;
        item.UpdatedAt = DateTime.UtcNow;

        var now = DateTime.UtcNow;
        original.IsVoided = true;
        original.VoidedAt = now;
        original.VoidedByUserId = userId;
        original.VoidReason = reason;

        var reversal = new StockMovement
        {
            InventoryItemId = original.InventoryItemId,
            MovementType = original.MovementType,
            Quantity = qty,
            QuantityBeforeMovement = before,
            QuantityAfterMovement = after,
            Remarks = $"Void of movement #{original.Id}. Reason: {reason}",
            PerformedByUserId = userId,
            ReversalOfMovementId = original.Id,
            MovementDate = now
        };
        _db.StockMovements.Add(reversal);

        // Undo the consumption an issuance recorded, against the month it landed in.
        if (original.MovementType == StockMovementType.Issuance)
        {
            var (yr, mo) = (original.MovementDate.Year, original.MovementDate.Month);
            var record = await _db.ConsumptionRecords.FirstOrDefaultAsync(c =>
                c.InventoryItemId == original.InventoryItemId && c.Year == yr && c.Month == mo);
            if (record is not null)
                record.QuantityConsumed = Math.Max(0, record.QuantityConsumed - qty);
        }

        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "StockMovement_Void", "StockMovement", original.Id,
            $"Item: {item.Name}, Qty: {qty}, Reason: {reason}");
        await _notifications.BroadcastStockChangedAsync();

        await _db.Entry(reversal).Reference(m => m.InventoryItem).LoadAsync();
        await _db.Entry(reversal).Reference(m => m.PerformedByUser).LoadAsync();
        return _mapper.Map<StockMovementDto>(reversal);
    }

    // Reverse of ConsumeBatchesFefoAsync: put voided stock back onto the batches
    // it was most likely drawn from — earliest-expiring first, never past a
    // batch's original received quantity. Any surplus with no batch to hold it
    // simply lifts QuantityOnHand (mirroring pre-batch stock on the way out).
    private async Task RestoreBatchesFefoAsync(int inventoryItemId, decimal quantity)
    {
        var batches = await _db.ItemBatches
            .Where(b => b.InventoryItemId == inventoryItemId && b.RemainingQuantity < b.Quantity)
            .OrderBy(b => b.ExpirationDate == null)   // dated batches first
            .ThenBy(b => b.ExpirationDate)
            .ThenBy(b => b.ReceivedDate)
            .ToListAsync();

        var remaining = quantity;
        foreach (var batch in batches)
        {
            if (remaining <= 0) break;
            var restore = Math.Min(batch.Quantity - batch.RemainingQuantity, remaining);
            batch.RemainingQuantity += restore;
            remaining -= restore;
        }
    }

    // FEFO (First-Expire-First-Out): consume issued/disposed stock from the
    // batch expiring soonest so RemainingQuantity tracks the physical shelf.
    // Stock that predates batch tracking simply has no batch to consume —
    // any shortfall is ignored rather than blocking the movement.
    private async Task ConsumeBatchesFefoAsync(int inventoryItemId, decimal quantity)
    {
        var batches = await _db.ItemBatches
            .Where(b => b.InventoryItemId == inventoryItemId && b.RemainingQuantity > 0)
            .OrderBy(b => b.ExpirationDate == null)   // dated batches first
            .ThenBy(b => b.ExpirationDate)
            .ThenBy(b => b.ReceivedDate)
            .ToListAsync();

        var remaining = quantity;
        foreach (var batch in batches)
        {
            if (remaining <= 0) break;
            var take = Math.Min(batch.RemainingQuantity, remaining);
            batch.RemainingQuantity -= take;
            remaining -= take;
        }
    }
}
