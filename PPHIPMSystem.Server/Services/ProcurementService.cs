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

    public ProcurementService(ApplicationDbContext db, IMapper mapper, INotificationService notifications, IAuditLogService audit)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
        _audit = audit;
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
        await _db.SaveChangesAsync();

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

        var costMap = dto.ItemCosts.ToDictionary(c => c.ProcurementRequestItemId, c => c.UnitCost);
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

        _db.PurchaseOrders.Add(po);
        request.Status = ProcurementStatus.PurchaseOrderGenerated;
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _notifications.CreateAsync(request.RequestedByUserId,
            NotificationType.PurchaseOrderGenerated,
            "Purchase Order Generated",
            $"PO {po.PONumber} generated for your request {request.RequestNumber}.",
            po.Id, "PurchaseOrder");

        await _audit.LogAsync(userId, "POGenerated", "PurchaseOrder", po.Id, po.PONumber);

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

    public async Task<bool> ConfirmDeliveryAsync(int purchaseOrderId, string userId)
    {
        var po = await _db.PurchaseOrders
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == purchaseOrderId);
        if (po is null || po.IsDelivered) return false;

        po.IsDelivered = true;
        po.DeliveredAt = DateTime.UtcNow;

        foreach (var item in po.Items)
        {
            var invItem = await _db.InventoryItems.FindAsync(item.InventoryItemId);
            if (invItem is null) continue;
            invItem.QuantityOnHand += item.QuantityOrdered;
            invItem.UpdatedAt = DateTime.UtcNow;
            item.QuantityDelivered = item.QuantityOrdered;

            _db.StockMovements.Add(new StockMovement
            {
                InventoryItemId = item.InventoryItemId,
                MovementType = StockMovementType.Receipt,
                Quantity = item.QuantityOrdered,
                QuantityBeforeMovement = invItem.QuantityOnHand - item.QuantityOrdered,
                QuantityAfterMovement = invItem.QuantityOnHand,
                Remarks = $"Received via PO {po.PONumber}",
                PerformedByUserId = userId,
                PurchaseOrderId = purchaseOrderId
            });
        }

        var request = await _db.ProcurementRequests.FindAsync(po.ProcurementRequestId);
        if (request is not null) request.Status = ProcurementStatus.Delivered;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, "DeliveryConfirmed", "PurchaseOrder", purchaseOrderId, po.PONumber);
        return true;
    }
}
