using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.StockAdjustment;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class StockAdjustmentService : IStockAdjustmentService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notifications;
    private readonly IAuditLogService _audit;

    public StockAdjustmentService(ApplicationDbContext db, IMapper mapper, INotificationService notifications, IAuditLogService audit)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
        _audit = audit;
    }

    public async Task<IEnumerable<StockAdjustmentDto>> GetAllAsync(string? status)
    {
        var query = _db.StockAdjustments
            .Include(a => a.InventoryItem)
            .Include(a => a.RequestedByUser)
            .Include(a => a.ApprovedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AdjustmentStatus>(status, out var s))
            query = query.Where(a => a.Status == s);

        var items = await query.OrderByDescending(a => a.RequestedAt).ToListAsync();
        return _mapper.Map<IEnumerable<StockAdjustmentDto>>(items);
    }

    public async Task<StockAdjustmentDto?> GetByIdAsync(int id)
    {
        var item = await _db.StockAdjustments
            .Include(a => a.InventoryItem)
            .Include(a => a.RequestedByUser)
            .Include(a => a.ApprovedByUser)
            .FirstOrDefaultAsync(a => a.Id == id);
        return item is null ? null : _mapper.Map<StockAdjustmentDto>(item);
    }

    public async Task<StockAdjustmentDto> CreateAsync(CreateStockAdjustmentDto dto, string userId)
    {
        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Item not found.");

        var adjustment = new StockAdjustment
        {
            InventoryItemId = dto.InventoryItemId,
            RecordedQuantity = item.QuantityOnHand,
            PhysicalCount = dto.PhysicalCount,
            Reason = dto.Reason,
            RequestedByUserId = userId,
            Status = AdjustmentStatus.Pending
        };
        _db.StockAdjustments.Add(adjustment);
        await _db.SaveChangesAsync();

        await _notifications.CreateForRoleAsync(
            UserRole.HospitalAdministrator,
            NotificationType.StockAdjustmentRequested,
            "Stock Adjustment Requested",
            $"A stock adjustment for {item.Name} has been submitted for approval.",
            adjustment.Id, "StockAdjustment");

        await _audit.LogAsync(userId, "AdjustmentRequested", "StockAdjustment", adjustment.Id,
            $"Item: {item.Name}, Recorded: {item.QuantityOnHand}, Physical: {dto.PhysicalCount}");

        await _db.Entry(adjustment).Reference(a => a.InventoryItem).LoadAsync();
        await _db.Entry(adjustment).Reference(a => a.RequestedByUser).LoadAsync();
        return _mapper.Map<StockAdjustmentDto>(adjustment);
    }

    public async Task<StockAdjustmentDto?> ProcessApprovalAsync(int id, ApproveAdjustmentDto dto, string approverId)
    {
        var adjustment = await _db.StockAdjustments
            .Include(a => a.InventoryItem)
            .Include(a => a.RequestedByUser)
            .FirstOrDefaultAsync(a => a.Id == id && a.Status == AdjustmentStatus.Pending);

        if (adjustment is null) return null;

        adjustment.ApprovedByUserId = approverId;
        adjustment.ApproverRemarks = dto.Remarks;
        adjustment.ApprovedAt = DateTime.UtcNow;
        adjustment.Status = dto.Approved ? AdjustmentStatus.Approved : AdjustmentStatus.Rejected;

        if (dto.Approved)
        {
            var item = adjustment.InventoryItem;
            item.QuantityOnHand = adjustment.PhysicalCount;
            item.UpdatedAt = DateTime.UtcNow;

            _db.StockMovements.Add(new StockMovement
            {
                InventoryItemId = item.Id,
                MovementType = StockMovementType.Adjustment,
                Quantity = Math.Abs(adjustment.PhysicalCount - adjustment.RecordedQuantity),
                QuantityBeforeMovement = adjustment.RecordedQuantity,
                QuantityAfterMovement = adjustment.PhysicalCount,
                Remarks = $"Adjustment #{id}: {adjustment.Reason}",
                PerformedByUserId = approverId
            });
        }

        await _db.SaveChangesAsync();

        var notifType = dto.Approved
            ? NotificationType.StockAdjustmentApproved
            : NotificationType.StockAdjustmentRejected;
        await _notifications.CreateAsync(
            adjustment.RequestedByUserId,
            notifType,
            dto.Approved ? "Adjustment Approved" : "Adjustment Rejected",
            $"Your stock adjustment for {adjustment.InventoryItem.Name} was {(dto.Approved ? "approved" : "rejected")}.",
            id, "StockAdjustment");

        await _audit.LogAsync(approverId, dto.Approved ? "AdjustmentApproved" : "AdjustmentRejected",
            "StockAdjustment", id, dto.Remarks);

        await _db.Entry(adjustment).Reference(a => a.ApprovedByUser).LoadAsync();
        return _mapper.Map<StockAdjustmentDto>(adjustment);
    }
}
