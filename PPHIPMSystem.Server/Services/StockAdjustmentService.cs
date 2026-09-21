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

    public async Task<CycleCountResultDto> SubmitCycleCountAsync(CycleCountDto dto, string userId)
    {
        var ids = dto.Lines.Select(l => l.InventoryItemId).Distinct().ToList();
        var items = await _db.InventoryItems
            .Where(i => ids.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var result = new CycleCountResultDto();
        // Last count wins if the same item appears twice in the worksheet.
        foreach (var line in dto.Lines.GroupBy(l => l.InventoryItemId).Select(g => g.Last()))
        {
            if (!items.TryGetValue(line.InventoryItemId, out var item))
                throw new InvalidOperationException($"Item #{line.InventoryItemId} does not exist.");

            if (line.PhysicalCount == item.QuantityOnHand)
            {
                result.UnchangedItems++;
                continue;
            }

            _db.StockAdjustments.Add(new StockAdjustment
            {
                InventoryItemId = item.Id,
                RecordedQuantity = item.QuantityOnHand,
                PhysicalCount = line.PhysicalCount,
                Reason = dto.Reason,
                RequestedByUserId = userId,
                Status = AdjustmentStatus.Pending
            });
            result.AdjustmentsCreated++;
        }

        if (result.AdjustmentsCreated > 0)
        {
            await _db.SaveChangesAsync();

            // One notification for the whole count, not one per line.
            await _notifications.CreateForRoleAsync(
                UserRole.HospitalAdministrator,
                NotificationType.StockAdjustmentRequested,
                "Cycle Count Submitted",
                $"A physical count generated {result.AdjustmentsCreated} stock adjustment(s) awaiting approval.",
                null, "StockAdjustment");

            await _audit.LogAsync(userId, "CycleCountSubmitted", "StockAdjustment", null,
                $"{result.AdjustmentsCreated} adjustment(s) created, {result.UnchangedItems} item(s) matched. Reason: {dto.Reason}");
        }

        return result;
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
            // Apply the counted variance to today's balance rather than overwriting
            // it with the count: receipts or issuances recorded between the count
            // and this approval would otherwise be silently erased.
            var item = adjustment.InventoryItem;
            var variance = adjustment.PhysicalCount - adjustment.RecordedQuantity;
            var before = item.QuantityOnHand;
            var after = before + variance;
            if (after < 0)
                throw new InvalidOperationException(
                    $"Stock of {item.Name} has changed since the count ({before} on hand now); applying the " +
                    $"variance of {variance} would go below zero. Reject this adjustment and recount.");

            item.QuantityOnHand = after;
            item.UpdatedAt = DateTime.UtcNow;

            _db.StockMovements.Add(new StockMovement
            {
                InventoryItemId = item.Id,
                MovementType = StockMovementType.Adjustment,
                Quantity = Math.Abs(variance),
                QuantityBeforeMovement = before,
                QuantityAfterMovement = after,
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
