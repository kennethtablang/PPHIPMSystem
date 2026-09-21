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

    public async Task<StockMovementPageDto> GetAllAsync(int? itemId, string? type, DateTime? from, DateTime? to, int page = 1, int pageSize = 50)
    {
        var query = _db.StockMovements
            .Include(m => m.InventoryItem)
            .Include(m => m.PerformedByUser)
            .Include(m => m.PurchaseOrder)
            .Include(m => m.Department)
            .Include(m => m.ToDepartment)
            .Include(m => m.VoidedByUser)
            .AsQueryable();

        if (itemId.HasValue) query = query.Where(m => m.InventoryItemId == itemId.Value);
        if (Enum.TryParse<StockMovementType>(type, ignoreCase: true, out var movementType))
            query = query.Where(m => m.MovementType == movementType);
        if (from.HasValue) query = query.Where(m => m.MovementDate >= from.Value);
        if (to.HasValue) query = query.Where(m => m.MovementDate <= to.Value);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        // Stat-card aggregates cover the whole filtered set — not just the
        // visible page — and exclude voided originals plus their reversals.
        var effective = query.Where(m => !m.IsVoided && m.ReversalOfMovementId == null);
        var unitsReceived = await effective
            .Where(m => m.MovementType == StockMovementType.Receipt)
            .SumAsync(m => (decimal?)m.Quantity) ?? 0;
        var unitsIssued = await effective
            .Where(m => m.MovementType == StockMovementType.Issuance)
            .SumAsync(m => (decimal?)m.Quantity) ?? 0;
        var disposalCount = await effective.CountAsync(m => m.MovementType == StockMovementType.Disposal);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(m => m.MovementDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return new StockMovementPageDto
        {
            Items = _mapper.Map<IEnumerable<StockMovementDto>>(items),
            Total = total,
            Page = page,
            PageSize = pageSize,
            UnitsReceived = unitsReceived,
            UnitsIssued = unitsIssued,
            DisposalCount = disposalCount,
        };
    }

    public async Task<StockMovementDto> CreateAsync(CreateStockMovementDto dto, string userId)
    {
        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Inventory item not found.");

        if (dto.PurchaseOrderId.HasValue &&
            await _db.PurchaseOrders.FindAsync(dto.PurchaseOrderId.Value) is null)
            throw new InvalidOperationException("Purchase order not found.");

        Department? department = null;
        if (dto.DepartmentId.HasValue)
        {
            if (dto.MovementType is not (StockMovementType.Issuance or StockMovementType.Return))
                throw new InvalidOperationException("A department applies only to issuances (destination) and returns (source).");
            department = await _db.Departments.FindAsync(dto.DepartmentId.Value)
                ?? throw new InvalidOperationException("Department not found.");
            if (!department.IsActive)
                throw new InvalidOperationException("That department is inactive.");
        }

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

        // Department ledger: issuing moves stock into the department's balance;
        // a return draws it back out (and must not exceed what's recorded there).
        if (department is not null)
        {
            if (dto.MovementType == StockMovementType.Issuance)
                await AdjustDepartmentStockAsync(department, item, dto.Quantity);
            else
                await AdjustDepartmentStockAsync(department, item, -dto.Quantity);
        }

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
            DepartmentId = dto.DepartmentId,
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

    // Phase 2 of department transfers: a ward records what it actually used.
    //
    // Central stock is deliberately untouched — the item left the storeroom when
    // it was issued, and the issuance already wrote the ConsumptionRecord that
    // feeds demand forecasting. Counting it again here would double the forecast
    // input and drive QuantityOnHand negative. All this does is draw the ward's
    // balance down and leave an auditable movement behind.
    public async Task<StockMovementDto> RecordDepartmentConsumptionAsync(
        RecordDepartmentConsumptionDto dto, string userId)
    {
        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Inventory item not found.");

        var department = await _db.Departments.FindAsync(dto.DepartmentId)
            ?? throw new InvalidOperationException("Department not found.");
        if (!department.IsActive)
            throw new InvalidOperationException("That department is inactive.");

        // Refuses to draw the ward below zero, with a message naming the balance.
        await AdjustDepartmentStockAsync(department, item, -dto.Quantity);

        var movement = new StockMovement
        {
            InventoryItemId = dto.InventoryItemId,
            MovementType = StockMovementType.DepartmentConsumption,
            Quantity = dto.Quantity,
            // Central stock is unchanged, so before == after. Recording the real
            // on-hand figure keeps the movement row meaningful in the ledger.
            QuantityBeforeMovement = item.QuantityOnHand,
            QuantityAfterMovement = item.QuantityOnHand,
            Remarks = dto.Remarks,
            PerformedByUserId = userId,
            DepartmentId = department.Id,
            MovementDate = DateTime.UtcNow
        };
        _db.StockMovements.Add(movement);

        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "StockMovement_DepartmentConsumption", "StockMovement", movement.Id,
            $"Item: {item.Name}, Qty: {dto.Quantity}, Department: {department.Name}");
        await _notifications.BroadcastStockChangedAsync();

        await _db.Entry(movement).Reference(m => m.InventoryItem).LoadAsync();
        await _db.Entry(movement).Reference(m => m.PerformedByUser).LoadAsync();
        await _db.Entry(movement).Reference(m => m.Department).LoadAsync();
        return _mapper.Map<StockMovementDto>(movement);
    }

    // Phase 3 of department transfers: stock moves straight from one ward to
    // another without a trip back through the storeroom.
    //
    // Central QuantityOnHand, the batches, and the ConsumptionRecords are all
    // deliberately untouched: the units left central stock at issuance and were
    // counted for forecasting then. Only the two ward balances change, so the
    // hospital-wide totals are identical before and after — this is a move
    // between two pockets of the same trousers.
    public async Task<StockMovementDto> TransferBetweenDepartmentsAsync(
        TransferDepartmentStockDto dto, string userId)
    {
        if (dto.FromDepartmentId == dto.ToDepartmentId)
            throw new InvalidOperationException("Source and destination departments must be different.");

        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Inventory item not found.");

        var from = await _db.Departments.FindAsync(dto.FromDepartmentId)
            ?? throw new InvalidOperationException("Source department not found.");
        var to = await _db.Departments.FindAsync(dto.ToDepartmentId)
            ?? throw new InvalidOperationException("Destination department not found.");
        if (!to.IsActive)
            throw new InvalidOperationException("That destination department is inactive.");

        // Source first: it throws with the ward's actual balance if short, so
        // nothing is credited to the destination on a failed transfer.
        await AdjustDepartmentStockAsync(from, item, -dto.Quantity);
        await AdjustDepartmentStockAsync(to, item, dto.Quantity);

        var movement = new StockMovement
        {
            InventoryItemId = dto.InventoryItemId,
            MovementType = StockMovementType.DepartmentTransfer,
            Quantity = dto.Quantity,
            // Central stock is unchanged, so before == after; recording the real
            // on-hand figure keeps the row meaningful alongside the others.
            QuantityBeforeMovement = item.QuantityOnHand,
            QuantityAfterMovement = item.QuantityOnHand,
            Remarks = dto.Remarks,
            PerformedByUserId = userId,
            DepartmentId = from.Id,
            ToDepartmentId = to.Id,
            MovementDate = DateTime.UtcNow
        };
        _db.StockMovements.Add(movement);

        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "StockMovement_DepartmentTransfer", "StockMovement", movement.Id,
            $"Item: {item.Name}, Qty: {dto.Quantity}, {from.Name} → {to.Name}");
        await _notifications.BroadcastStockChangedAsync();

        await _db.Entry(movement).Reference(m => m.InventoryItem).LoadAsync();
        await _db.Entry(movement).Reference(m => m.PerformedByUser).LoadAsync();
        await _db.Entry(movement).Reference(m => m.Department).LoadAsync();
        await _db.Entry(movement).Reference(m => m.ToDepartment).LoadAsync();
        return _mapper.Map<StockMovementDto>(movement);
    }

    public async Task<StockMovementDto> VoidAsync(int movementId, string reason, string userId)
    {
        var original = await _db.StockMovements
            .Include(m => m.InventoryItem)
            .Include(m => m.Department)
            .Include(m => m.ToDepartment)
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

        // Movements tied to one batch (batch receipts, batch disposals) are
        // reversed on that batch; everything else falls back to FEFO.
        var batch = original.ItemBatchId.HasValue
            ? await _db.ItemBatches.FindAsync(original.ItemBatchId.Value)
            : null;

        switch (original.MovementType)
        {
            case StockMovementType.Receipt:
            case StockMovementType.Return:
                // Original added stock; reversing removes it. Guard against the
                // stock having since been drawn down below what we must claw back.
                if (qty > before)
                    throw new InvalidOperationException(
                        "Can't void: on-hand stock has since dropped below the quantity to reverse.");
                if (batch is not null)
                {
                    // A received batch can only be un-received while all of it is
                    // still on the shelf; otherwise later issuances depend on it.
                    if (batch.RemainingQuantity < qty)
                        throw new InvalidOperationException(
                            $"Can't void: {batch.Quantity - batch.RemainingQuantity} unit(s) of this batch have already " +
                            "been issued or disposed. Void those movements first, or record a stock adjustment.");
                    batch.RemainingQuantity -= qty;
                }
                after = before - qty;
                break;
            case StockMovementType.Issuance:
            case StockMovementType.Disposal:
                // Original removed stock and consumed batches; reversing restores both.
                after = before + qty;
                if (batch is not null)
                    batch.RemainingQuantity = Math.Min(batch.Quantity, batch.RemainingQuantity + qty);
                else
                    await RestoreBatchesFefoAsync(original.InventoryItemId, qty);
                break;
            case StockMovementType.DepartmentConsumption:
            case StockMovementType.DepartmentTransfer:
                // Neither touched central stock or batches, so there is nothing
                // to restore here — only the department balances below.
                after = before;
                break;
            default:
                throw new InvalidOperationException("This movement type can't be voided.");
        }

        // Undo the department-ledger side of the original movement too: a voided
        // issuance takes the stock back out of the department; a voided return or
        // ward consumption puts it back in. A voided transfer walks the units
        // back across — destination first, so a receiving ward that has already
        // used the stock fails the void before the source is credited.
        if (original.MovementType == StockMovementType.DepartmentTransfer)
        {
            if (original.ToDepartment is null || original.Department is null)
                throw new InvalidOperationException("This transfer is missing a department and can't be voided.");
            await AdjustDepartmentStockAsync(original.ToDepartment, item, -qty);
            await AdjustDepartmentStockAsync(original.Department, item, qty);
        }
        else if (original.Department is not null)
        {
            var deptDelta = original.MovementType == StockMovementType.Issuance ? -qty : qty;
            await AdjustDepartmentStockAsync(original.Department, item, deptDelta);
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
            DepartmentId = original.DepartmentId,
            ToDepartmentId = original.ToDepartmentId,
            QuantityBeforeMovement = before,
            QuantityAfterMovement = after,
            Remarks = $"Void of movement #{original.Id}. Reason: {reason}",
            PerformedByUserId = userId,
            ReversalOfMovementId = original.Id,
            ItemBatchId = original.ItemBatchId,
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

    // Applies a delta to a department's balance of an item, creating the ledger
    // row on first issuance and refusing to draw below zero.
    private async Task AdjustDepartmentStockAsync(Department department, InventoryItem item, decimal delta)
    {
        var row = await _db.DepartmentStocks.FirstOrDefaultAsync(d =>
            d.DepartmentId == department.Id && d.InventoryItemId == item.Id);

        if (row is null)
        {
            if (delta < 0)
                throw new InvalidOperationException(
                    $"{department.Name} has no recorded stock of {item.Name} to return.");
            _db.DepartmentStocks.Add(new DepartmentStock
            {
                DepartmentId = department.Id,
                InventoryItemId = item.Id,
                Quantity = delta
            });
            return;
        }

        if (row.Quantity + delta < 0)
            throw new InvalidOperationException(
                $"{department.Name} only has {row.Quantity} {item.Unit} of {item.Name} recorded — cannot process {Math.Abs(delta)}.");

        row.Quantity += delta;
        row.UpdatedAt = DateTime.UtcNow;
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
