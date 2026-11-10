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

    // Direct correction from the Items list (Revision 4): the Inventory Officer
    // types the correct quantity and a reason, and it applies at once — no
    // separate request or approval wait. The adjustment row keeps the full
    // record: original quantity (RecordedQuantity), adjusted quantity
    // (PhysicalCount), reason, who made it and when.
    public async Task<StockAdjustmentDto> CreateAsync(CreateStockAdjustmentDto dto, string userId)
    {
        var item = await _db.InventoryItems.FindAsync(dto.InventoryItemId)
            ?? throw new InvalidOperationException("Item not found.");
        if (!item.IsActive)
            throw new InvalidOperationException("This item is inactive.");
        if (dto.PhysicalCount == item.QuantityOnHand)
            throw new InvalidOperationException(
                $"{item.Name} is already at {item.QuantityOnHand:0.##} {item.Unit} — nothing to adjust.");

        var adjustment = await ApplyAsync(item, dto.PhysicalCount, dto.Reason.Trim(), userId);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "StockAdjusted", "StockAdjustment", adjustment.Id,
            $"Item: {item.Name}, {adjustment.RecordedQuantity:0.##} → {adjustment.PhysicalCount:0.##} {item.Unit}. Reason: {adjustment.Reason}");
        await AfterStockChangeAsync([item]);

        await _db.Entry(adjustment).Reference(a => a.InventoryItem).LoadAsync();
        await _db.Entry(adjustment).Reference(a => a.RequestedByUser).LoadAsync();
        await _db.Entry(adjustment).Reference(a => a.ApprovedByUser).LoadAsync();
        return _mapper.Map<StockAdjustmentDto>(adjustment);
    }

    // Physical count of many items at once: every line that differs from the
    // system is corrected immediately, the same as a single adjustment.
    public async Task<CycleCountResultDto> SubmitCycleCountAsync(CycleCountDto dto, string userId)
    {
        var ids = dto.Lines.Select(l => l.InventoryItemId).Distinct().ToList();
        var items = await _db.InventoryItems
            .Where(i => ids.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var result = new CycleCountResultDto();
        var changed = new List<InventoryItem>();
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

            await ApplyAsync(item, line.PhysicalCount, dto.Reason.Trim(), userId);
            changed.Add(item);
            result.AdjustmentsCreated++;
        }

        if (result.AdjustmentsCreated > 0)
        {
            await _db.SaveChangesAsync();
            await _audit.LogAsync(userId, "CycleCountApplied", "StockAdjustment", null,
                $"{result.AdjustmentsCreated} item(s) corrected, {result.UnchangedItems} item(s) matched. Reason: {dto.Reason}");
            await AfterStockChangeAsync(changed);
        }

        return result;
    }

    // Sets an item to the counted quantity and records it: the adjustment
    // row, an Adjustment movement in the ledger, and the batches brought in
    // line so Batches & Expiry agrees with the Items list. Not saved here.
    private async Task<StockAdjustment> ApplyAsync(InventoryItem item, decimal newQuantity, string reason, string userId)
    {
        if (newQuantity < 0)
            throw new InvalidOperationException("The adjusted quantity cannot be negative.");

        var now = DateTime.UtcNow;
        var adjustment = new StockAdjustment
        {
            InventoryItemId = item.Id,
            RecordedQuantity = item.QuantityOnHand,
            PhysicalCount = newQuantity,
            Reason = reason,
            RequestedByUserId = userId,
            RequestedAt = now,
            // Applied directly by the officer who made it.
            Status = AdjustmentStatus.Approved,
            ApprovedByUserId = userId,
            ApprovedAt = now
        };
        _db.StockAdjustments.Add(adjustment);

        await ApplyVarianceAsync(item, newQuantity - item.QuantityOnHand, reason, userId);
        return adjustment;
    }

    private async Task ApplyVarianceAsync(InventoryItem item, decimal variance, string reason, string userId)
    {
        var before = item.QuantityOnHand;
        var after = before + variance;
        item.QuantityOnHand = after;
        item.UpdatedAt = DateTime.UtcNow;

        if (variance < 0)
            await BatchLedger.ConsumeFefoAsync(_db, item.Id, -variance);
        else
            await BatchLedger.RestoreFefoAsync(_db, item.Id, variance);
        await BatchLedger.AlignToOnHandAsync(_db, item.Id, after);

        var sign = variance >= 0 ? "+" : "-";
        _db.StockMovements.Add(new StockMovement
        {
            InventoryItemId = item.Id,
            MovementType = StockMovementType.Adjustment,
            Quantity = Math.Abs(variance),
            QuantityBeforeMovement = before,
            QuantityAfterMovement = after,
            Remarks = Clip($"Stock adjustment ({sign}{Math.Abs(variance):0.##}): {reason}"),
            PerformedByUserId = userId,
            MovementDate = DateTime.UtcNow
        });
    }

    private static string Clip(string text) => text.Length <= 500 ? text : text[..499] + "…";

    // Low-stock alert for anything the correction pushed under its reorder
    // level, and a live refresh for open pages.
    private async Task AfterStockChangeAsync(List<InventoryItem> items)
    {
        foreach (var item in items.Where(i => i.QuantityOnHand <= i.ReorderThreshold))
            foreach (var role in new[] { UserRole.InventoryOfficer, UserRole.ProcurementStaff })
                await _notifications.CreateForRoleAsync(role, NotificationType.LowStock, "Low Stock Alert",
                    $"{item.Name} is at {item.QuantityOnHand:0.##} {item.Unit}, below reorder threshold of {item.ReorderThreshold:0.##}.",
                    item.Id, "InventoryItem");
        await _notifications.BroadcastStockChangedAsync();
    }

    public async Task<StockAdjustmentDto?> ProcessApprovalAsync(int id, ApproveAdjustmentDto dto, string approverId)
    {
        var adjustment = await _db.StockAdjustments
            .Include(a => a.InventoryItem)
            .Include(a => a.RequestedByUser)
            .FirstOrDefaultAsync(a => a.Id == id && a.Status == AdjustmentStatus.Pending);

        if (adjustment is null) return null;

        // Corrections are made by the Inventory Head and approved by the Head
        // of Property & Supply — never by the person who counted.
        if (adjustment.RequestedByUserId == approverId)
            throw new InvalidOperationException(
                "You filed this correction, so it must be approved by another Head of Property & Supply account.");

        adjustment.ApprovedByUserId = approverId;
        adjustment.ApproverRemarks = dto.Remarks;
        adjustment.ApprovedAt = DateTime.UtcNow;
        adjustment.Status = dto.Approved ? AdjustmentStatus.Approved : AdjustmentStatus.Rejected;

        if (dto.Approved)
        {
            // Legacy request filed before direct adjustments: apply the counted
            // variance to today's balance rather than overwriting it, so
            // movements recorded since the count are not erased.
            var item = adjustment.InventoryItem;
            var variance = adjustment.PhysicalCount - adjustment.RecordedQuantity;
            if (item.QuantityOnHand + variance < 0)
                throw new InvalidOperationException(
                    $"Stock of {item.Name} has changed since the count ({item.QuantityOnHand} on hand now); applying the " +
                    $"variance of {variance} would go below zero. Reject this adjustment and recount.");
            await ApplyVarianceAsync(item, variance, $"Adjustment #{id}: {adjustment.Reason}", approverId);
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
