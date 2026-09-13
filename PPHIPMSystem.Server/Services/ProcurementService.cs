using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class ProcurementService : IProcurementService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notifications;
    private readonly IAuditLogService _audit;
    private readonly IDepartmentBudgetService _budgets;

    public ProcurementService(ApplicationDbContext db, IMapper mapper, INotificationService notifications,
        IAuditLogService audit, IDepartmentBudgetService budgets)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
        _audit = audit;
        _budgets = budgets;
    }

    private IQueryable<ProcurementRequest> BaseQuery() =>
        _db.ProcurementRequests
            .Include(r => r.Department)
            .Include(r => r.RequestedByUser)
            .Include(r => r.Items).ThenInclude(i => i.InventoryItem)
            .Include(r => r.Approvals).ThenInclude(a => a.ApproverUser)
            .Include(r => r.PurchaseOrder);

    public async Task<IEnumerable<ProcurementRequestDto>> GetAllAsync(string? status, int? departmentId)
    {
        var query = BaseQuery().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ProcurementStatus>(status, out var s))
            query = query.Where(r => r.Status == s);
        if (departmentId.HasValue)
            query = query.Where(r => r.DepartmentId == departmentId.Value);
        var items = await query.OrderByDescending(r => r.RequestedAt).ToListAsync();
        return _mapper.Map<IEnumerable<ProcurementRequestDto>>(items);
    }

    public async Task<ProcurementRequestDto?> GetByIdAsync(int id)
    {
        var item = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        return item is null ? null : _mapper.Map<ProcurementRequestDto>(item);
    }

    public async Task<ProcurementRequestDto> CreateAsync(CreateProcurementRequestDto dto, string userId, int departmentId)
    {
        // Validate item ids up front so a bad id is a 400, not an FK 500.
        var requestedIds = dto.Items.Select(i => i.InventoryItemId).Distinct().ToList();
        var knownIds = await _db.InventoryItems
            .Where(i => requestedIds.Contains(i.Id))
            .Select(i => i.Id)
            .ToListAsync();
        if (knownIds.Count != requestedIds.Count)
            throw new InvalidOperationException("One or more requested items do not exist.");

        var count = await _db.ProcurementRequests.CountAsync() + 1;
        var request = new ProcurementRequest
        {
            RequestNumber = $"PR-{DateTime.UtcNow:yyyyMM}-{count:D4}",
            DepartmentId = departmentId,
            RequestedByUserId = userId,
            Justification = dto.Justification,
            Status = ProcurementStatus.SubmittedByDepartment,
            Items = dto.Items.Select(i => new ProcurementRequestItem
            {
                InventoryItemId = i.InventoryItemId,
                QuantityRequested = i.QuantityRequested,
                EstimatedUnitCost = i.EstimatedUnitCost,
                Remarks = i.Remarks
            }).ToList()
        };
        _db.ProcurementRequests.Add(request);

        // RequestNumber has a unique index; concurrent submissions can collide on
        // the Count()+1 number, so bump and retry instead of failing with a 500.
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                await _db.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException) when (attempt < 5)
            {
                count++;
                request.RequestNumber = $"PR-{DateTime.UtcNow:yyyyMM}-{count:D4}";
            }
        }

        await _audit.LogAsync(userId, "ProcurementCreated", "ProcurementRequest", request.Id, request.RequestNumber);

        return _mapper.Map<ProcurementRequestDto>(await BaseQuery().FirstAsync(r => r.Id == request.Id));
    }

    public async Task<ProcurementRequestDto?> SubmitAsync(int id, string userId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return null;

        if (request.Status != ProcurementStatus.SubmittedByDepartment && request.Status != ProcurementStatus.ReturnedForRevision)
            throw new InvalidOperationException("Request cannot be submitted at this stage.");

        request.Status = ProcurementStatus.SubmittedToProcurement;
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Notify Procurement Staff
        await _notifications.CreateForRoleAsync(UserRole.ProcurementStaff,
            NotificationType.ProcurementSubmitted,
            "New Procurement Request",
            $"Request {request.RequestNumber} submitted for review.",
            request.Id, "ProcurementRequest");

        // Also notify Inventory Officers so they can approve if items are in stock
        await _notifications.CreateForRoleAsync(UserRole.InventoryOfficer,
            NotificationType.ProcurementSubmitted,
            "Department Request Needs Inventory Review",
            $"Department request {request.RequestNumber} has been submitted. Please verify item availability.",
            request.Id, "ProcurementRequest");

        await _audit.LogAsync(userId, "ProcurementSubmitted", "ProcurementRequest", request.Id, request.RequestNumber);

        return _mapper.Map<ProcurementRequestDto>(request);
    }

    public async Task<ProcurementRequestDto?> ProcessApprovalAsync(int id, ApproveProcurementDto dto, string approverId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return null;

        var approver = await _db.Users.FindAsync(approverId)
            ?? throw new InvalidOperationException("Approver not found.");

        var action = dto.Action.ToLower() switch
        {
            "approve" => ApprovalAction.Approved,
            "reject" => ApprovalAction.Rejected,
            "return" => ApprovalAction.ReturnedForRevision,
            _ => throw new InvalidOperationException("Invalid action.")
        };

        var level = request.Approvals.Count + 1;
        request.Approvals.Add(new ProcurementApproval
        {
            ProcurementRequestId = id,
            ApproverUserId = approverId,
            ApproverRole = approver.Role,
            Action = action,
            ApprovalLevel = level,
            Remarks = dto.Remarks
        });

        request.Status = (action, approver.Role, request.Status) switch
        {
            (ApprovalAction.Rejected, _, _) => ProcurementStatus.Rejected,
            (ApprovalAction.ReturnedForRevision, _, _) => ProcurementStatus.ReturnedForRevision,
            // Inventory Officer can approve department requests directly (items available in stock)
            (ApprovalAction.Approved, UserRole.InventoryOfficer, ProcurementStatus.SubmittedToProcurement) => ProcurementStatus.ApprovedByInventoryOfficer,
            (ApprovalAction.Approved, UserRole.ProcurementStaff, ProcurementStatus.SubmittedToProcurement) => ProcurementStatus.ApprovedByProcurement,
            (ApprovalAction.Approved, UserRole.InventoryOfficer, ProcurementStatus.ApprovedByProcurement) => ProcurementStatus.ApprovedByInventoryOfficer,
            (ApprovalAction.Approved, UserRole.HospitalAdministrator, ProcurementStatus.ApprovedByInventoryOfficer) => ProcurementStatus.FullyApproved,
            (ApprovalAction.Approved, UserRole.SuperAdmin, ProcurementStatus.ApprovedByInventoryOfficer) => ProcurementStatus.FullyApproved,
            // Admins can approve at earlier stages too
            (ApprovalAction.Approved, UserRole.HospitalAdministrator, ProcurementStatus.SubmittedToProcurement) => ProcurementStatus.ApprovedByProcurement,
            (ApprovalAction.Approved, UserRole.HospitalAdministrator, ProcurementStatus.ApprovedByProcurement) => ProcurementStatus.ApprovedByInventoryOfficer,
            (ApprovalAction.Approved, UserRole.SuperAdmin, ProcurementStatus.SubmittedToProcurement) => ProcurementStatus.ApprovedByProcurement,
            (ApprovalAction.Approved, UserRole.SuperAdmin, ProcurementStatus.ApprovedByProcurement) => ProcurementStatus.ApprovedByInventoryOfficer,
            _ => throw new InvalidOperationException($"Approver with role {approver.Role} cannot approve request in {request.Status} status.")
        };
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var notifType = action == ApprovalAction.Approved
            ? NotificationType.ProcurementApproved
            : action == ApprovalAction.Rejected
                ? NotificationType.ProcurementRejected
                : NotificationType.ProcurementReturnedForRevision;

        await _notifications.CreateAsync(request.RequestedByUserId, notifType,
            $"Procurement {action}",
            $"Your request {request.RequestNumber} was {action} by {approver.FirstName} {approver.LastName}.",
            id, "ProcurementRequest");

        await _audit.LogAsync(approverId, $"Procurement{action}", "ProcurementRequest", id, dto.Remarks);

        return _mapper.Map<ProcurementRequestDto>(await BaseQuery().FirstAsync(r => r.Id == id));
    }

    public async Task<PurchaseOrderDto> GeneratePurchaseOrderAsync(int requestId, GeneratePurchaseOrderDto dto, string userId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == requestId)
            ?? throw new InvalidOperationException("Request not found.");

        if (request.Status != ProcurementStatus.FullyApproved)
            throw new InvalidOperationException("Request is not fully approved.");

        _ = await _db.Suppliers.FindAsync(dto.SupplierId)
            ?? throw new InvalidOperationException("Supplier not found.");

        // GroupBy tolerates duplicate item ids in the payload (last one wins)
        // where ToDictionary would throw.
        var costMap = dto.ItemCosts
            .GroupBy(c => c.ProcurementRequestItemId)
            .ToDictionary(g => g.Key, g => g.Last().UnitCost);
        var count = await _db.PurchaseOrders.CountAsync() + 1;

        var po = new PurchaseOrder
        {
            PONumber = $"PO-{DateTime.UtcNow:yyyyMM}-{count:D4}",
            ProcurementRequestId = requestId,
            SupplierId = dto.SupplierId,
            GeneratedByUserId = userId,
            Items = request.Items.Select(i => new PurchaseOrderItem
            {
                InventoryItemId = i.InventoryItemId,
                QuantityOrdered = i.QuantityRequested,
                UnitCost = costMap.TryGetValue(i.Id, out var cost) ? cost : i.EstimatedUnitCost ?? 0
            }).ToList()
        };
        po.TotalAmount = po.Items.Sum(i => i.QuantityOrdered * i.UnitCost);

        // Budget guard. The PO — not the approval — is where money is actually
        // committed to a supplier, and it is the first point where real costs
        // (rather than the requester's estimates) are known, so the department's
        // appropriation is checked here. Departments with no budget row for the
        // year are unbudgeted and pass straight through; whether an overrun
        // blocks or merely warns is the EnforceDepartmentBudget system setting.
        var budget = await _budgets.EvaluateAsync(request.DepartmentId, DateTime.UtcNow.Year, po.TotalAmount);
        if (budget.WouldBlock)
            throw new InvalidOperationException(
                $"Over budget: {budget.DepartmentName} has ₱{budget.Remaining:N2} left of its FY{budget.FiscalYear} " +
                $"appropriation (₱{budget.Amount:N2} budgeted, ₱{budget.Committed:N2} already committed). " +
                $"This order of ₱{po.TotalAmount:N2} exceeds it by ₱{Math.Abs(budget.RemainingAfter):N2}. " +
                "Raise the department's budget or reduce the order.");

        _db.PurchaseOrders.Add(po);
        request.Status = ProcurementStatus.PurchaseOrderGenerated;
        request.UpdatedAt = DateTime.UtcNow;

        // Same unique-number retry as CreateAsync — PONumber can collide under concurrency.
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                await _db.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException) when (attempt < 5)
            {
                count++;
                po.PONumber = $"PO-{DateTime.UtcNow:yyyyMM}-{count:D4}";
            }
        }

        await _notifications.CreateAsync(request.RequestedByUserId,
            NotificationType.PurchaseOrderGenerated,
            "Purchase Order Generated",
            $"PO {po.PONumber} generated for your request {request.RequestNumber}.",
            po.Id, "PurchaseOrder");

        await _audit.LogAsync(userId, "POGenerated", "PurchaseOrder", po.Id, po.PONumber);

        // Tell the people who own the money when a department is at the edge of
        // its appropriation — either an overrun that enforcement was off for, or
        // a ward that has now spent most of its year.
        if (budget.HasBudget)
        {
            var committedAfter = budget.Committed + po.TotalAmount;
            var utilisation = budget.Amount <= 0 ? 100 : committedAfter / budget.Amount * 100;
            if (budget.WouldExceed)
            {
                await _notifications.CreateForRoleAsync(UserRole.HospitalAdministrator,
                    NotificationType.BudgetAlert,
                    "Department Over Budget",
                    $"{budget.DepartmentName} is now ₱{committedAfter - budget.Amount:N2} over its FY{budget.FiscalYear} " +
                    $"budget of ₱{budget.Amount:N2} after PO {po.PONumber}.",
                    po.Id, "PurchaseOrder");
            }
            else if (utilisation >= 90)
            {
                await _notifications.CreateForRoleAsync(UserRole.HospitalAdministrator,
                    NotificationType.BudgetAlert,
                    "Department Budget Nearly Exhausted",
                    $"{budget.DepartmentName} has used {utilisation:N1}% of its FY{budget.FiscalYear} budget " +
                    $"(₱{budget.Amount - committedAfter:N2} left) after PO {po.PONumber}.",
                    po.Id, "PurchaseOrder");
            }
        }

        return _mapper.Map<PurchaseOrderDto>(await _db.PurchaseOrders
            .Include(p => p.ProcurementRequest)
            .Include(p => p.Supplier)
            .Include(p => p.GeneratedByUser)
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstAsync(p => p.Id == po.Id));
    }

    public async Task<PurchaseOrderDto?> GetPurchaseOrderAsync(int id)
    {
        var po = await _db.PurchaseOrders
            .Include(p => p.ProcurementRequest)
            .Include(p => p.Supplier)
            .Include(p => p.GeneratedByUser)
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == id);
        return po is null ? null : _mapper.Map<PurchaseOrderDto>(po);
    }

    public async Task<IEnumerable<PurchaseOrderDto>> GetAllPurchaseOrdersAsync()
    {
        var pos = await _db.PurchaseOrders
            .Include(p => p.ProcurementRequest)
            .Include(p => p.Supplier)
            .Include(p => p.GeneratedByUser)
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .OrderByDescending(p => p.GeneratedAt)
            .ToListAsync();
        return _mapper.Map<IEnumerable<PurchaseOrderDto>>(pos);
    }

    public async Task<bool> ConfirmDeliveryAsync(int purchaseOrderId, ConfirmDeliveryDto? dto, string userId)
    {
        var po = await _db.PurchaseOrders
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == purchaseOrderId);
        if (po is null || po.IsDelivered) return false;

        // Per-line details the receiver typed in (qty received, lot, expiry).
        var lineDetails = (dto?.Lines ?? [])
            .GroupBy(l => l.PurchaseOrderItemId)
            .ToDictionary(g => g.Key, g => g.Last());

        var receivedAnything = false;
        foreach (var item in po.Items)
        {
            var invItem = await _db.InventoryItems.FindAsync(item.InventoryItemId);
            if (invItem is null) continue;

            var outstanding = item.QuantityOrdered - (item.QuantityDelivered ?? 0);
            var details = lineDetails.GetValueOrDefault(item.Id);
            // No explicit quantity means the whole outstanding amount arrived.
            var received = details?.QuantityReceived ?? outstanding;

            if (received <= 0) continue; // nothing of this line in the shipment
            if (received > outstanding)
                throw new InvalidOperationException(
                    $"{invItem.Name}: received quantity ({received}) exceeds the outstanding amount ({outstanding}).");

            receivedAnything = true;
            invItem.QuantityOnHand += received;
            invItem.UpdatedAt = DateTime.UtcNow;
            item.QuantityDelivered = (item.QuantityDelivered ?? 0) + received;

            // Every delivered line becomes a batch so expiration tracking and
            // FEFO issuance can see PO-received stock.
            _db.ItemBatches.Add(new ItemBatch
            {
                InventoryItemId = item.InventoryItemId,
                Quantity = received,
                RemainingQuantity = received,
                LotNumber = string.IsNullOrWhiteSpace(details?.LotNumber) ? null : details!.LotNumber!.Trim(),
                ExpirationDate = details?.ExpirationDate,
                UnitCost = item.UnitCost, // carries acquisition cost for valuation
                PurchaseOrderId = purchaseOrderId,
                ReceivedDate = DateTime.UtcNow
            });

            _db.StockMovements.Add(new StockMovement
            {
                InventoryItemId = item.InventoryItemId,
                MovementType = StockMovementType.Receipt,
                Quantity = received,
                QuantityBeforeMovement = invItem.QuantityOnHand - received,
                QuantityAfterMovement = invItem.QuantityOnHand,
                Remarks = $"Received via PO {po.PONumber}",
                PerformedByUserId = userId,
                PurchaseOrderId = purchaseOrderId
            });
        }

        if (!receivedAnything)
            throw new InvalidOperationException("No quantities were received — enter at least one line quantity.");

        // The PO closes only once every line is fully delivered.
        var fullyDelivered = po.Items.All(i => (i.QuantityDelivered ?? 0) >= i.QuantityOrdered);
        if (fullyDelivered)
        {
            po.IsDelivered = true;
            po.DeliveredAt = DateTime.UtcNow;
            var request = await _db.ProcurementRequests.FindAsync(po.ProcurementRequestId);
            if (request is not null) request.Status = ProcurementStatus.Delivered;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, "DeliveryConfirmed", "PurchaseOrder", purchaseOrderId,
            $"{po.PONumber} ({(fullyDelivered ? "fully delivered" : "partial delivery")})");
        await _notifications.BroadcastStockChangedAsync();
        return true;
    }
}
