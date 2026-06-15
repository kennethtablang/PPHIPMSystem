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
                break;
            default:
                after = before;
                break;
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

        await _db.Entry(movement).Reference(m => m.InventoryItem).LoadAsync();
        await _db.Entry(movement).Reference(m => m.PerformedByUser).LoadAsync();
        return _mapper.Map<StockMovementDto>(movement);
    }
}
