using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.DTOs.StockMovement;
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
    private readonly IStockMovementService _stockMovements;

    // A request can be edited or cancelled by its department until inventory
    // review signs it off; after that the allocated quantities are committed.
    private static readonly ProcurementStatus[] EditableStatuses =
    [
        ProcurementStatus.SubmittedByDepartment,
        ProcurementStatus.SubmittedToProcurement,
        ProcurementStatus.ReturnedForRevision
    ];

    // Waiting on inventory review — the requests allocation is decided for.
    private static readonly ProcurementStatus[] AwaitingInventoryStatuses =
    [
        ProcurementStatus.SubmittedToProcurement,
        ProcurementStatus.ApprovedByProcurement // legacy rows from the old chain
    ];

    // Allocated but not yet released — that stock is spoken for.
    private static readonly ProcurementStatus[] ReservingStatuses =
    [
        ProcurementStatus.ApprovedByInventoryOfficer,
        ProcurementStatus.FullyApproved
    ];

    public ProcurementService(ApplicationDbContext db, IMapper mapper, INotificationService notifications,
        IAuditLogService audit, IDepartmentBudgetService budgets, IStockMovementService stockMovements)
    {
        _db = db;
        _mapper = mapper;
        _notifications = notifications;
        _audit = audit;
        _budgets = budgets;
        _stockMovements = stockMovements;
    }

    public static bool IsEditable(ProcurementStatus status) => EditableStatuses.Contains(status);

    private IQueryable<ProcurementRequest> BaseQuery() =>
        _db.ProcurementRequests
            .Include(r => r.Department)
            .Include(r => r.RequestedByUser)
            .Include(r => r.Items).ThenInclude(i => i.InventoryItem).ThenInclude(ii => ii.Category)
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

    // Validate department and item ids up front so a bad id is a 400, not an FK 500.
    private async Task ValidateRequestAsync(CreateProcurementRequestDto dto, int departmentId)
    {
        var department = await _db.Departments.FindAsync(departmentId)
            ?? throw new InvalidOperationException("Department not found.");
        if (!department.IsActive)
            throw new InvalidOperationException("That department is inactive.");

        var requestedIds = dto.Items.Select(i => i.InventoryItemId).Distinct().ToList();
        if (requestedIds.Count != dto.Items.Count)
            throw new InvalidOperationException("Each item can only appear once — combine the quantities into one line.");
        var knownIds = await _db.InventoryItems
            .Where(i => requestedIds.Contains(i.Id))
            .Select(i => i.Id)
            .ToListAsync();
        if (knownIds.Count != requestedIds.Count)
            throw new InvalidOperationException("One or more requested items do not exist.");
    }

    private static List<ProcurementRequestItem> BuildLines(CreateProcurementRequestDto dto) =>
        dto.Items.Select(i => new ProcurementRequestItem
        {
            InventoryItemId = i.InventoryItemId,
            QuantityRequested = i.QuantityRequested,
            EstimatedUnitCost = i.EstimatedUnitCost,
            Remarks = string.IsNullOrWhiteSpace(i.Remarks) ? null : i.Remarks.Trim()
        }).ToList();

    private static string? CleanName(string? name) => string.IsNullOrWhiteSpace(name) ? null : name.Trim();

    public async Task<ProcurementRequestDto> CreateAsync(CreateProcurementRequestDto dto, string userId, int departmentId)
    {
        await ValidateRequestAsync(dto, departmentId);

        var count = await _db.ProcurementRequests.CountAsync() + 1;
        var request = new ProcurementRequest
        {
            RequestNumber = $"PR-{DateTime.UtcNow:yyyyMM}-{count:D4}",
            DepartmentId = departmentId,
            RequestedByUserId = userId,
            RequestedByName = CleanName(dto.RequestedByName),
            Justification = dto.Justification,
            Status = ProcurementStatus.SubmittedByDepartment,
            Items = BuildLines(dto)
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

    public async Task<ProcurementRequestDto?> UpdateAsync(int id, UpdateProcurementRequestDto dto, string userId, int departmentId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return null;

        if (!IsEditable(request.Status))
            throw new InvalidOperationException("This request has already been approved by Inventory and can no longer be edited.");

        await ValidateRequestAsync(dto, departmentId);

        // Replacing the lines wholesale keeps add / remove / re-quantity one
        // operation; nothing references request lines before a PO exists.
        _db.ProcurementRequestItems.RemoveRange(request.Items);
        request.Items = BuildLines(dto);
        request.DepartmentId = departmentId;
        request.RequestedByName = CleanName(dto.RequestedByName);
        request.Justification = dto.Justification;
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "ProcurementEdited", "ProcurementRequest", request.Id, request.RequestNumber);

        if (request.Status == ProcurementStatus.SubmittedToProcurement)
            await _notifications.CreateForRoleAsync(UserRole.InventoryOfficer,
                NotificationType.ProcurementSubmitted,
                "Department Request Updated",
                $"Request {request.RequestNumber} was edited by the department before review.",
                request.Id, "ProcurementRequest");

        return _mapper.Map<ProcurementRequestDto>(await BaseQuery().FirstAsync(r => r.Id == id));
    }

    public async Task<ProcurementRequestDto?> CancelAsync(int id, string? reason, string userId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return null;

        if (!IsEditable(request.Status))
            throw new InvalidOperationException("This request has already been approved by Inventory and can no longer be cancelled.");

        var wasInReview = request.Status == ProcurementStatus.SubmittedToProcurement;
        request.Status = ProcurementStatus.Cancelled;
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(userId, "ProcurementCancelled", "ProcurementRequest", request.Id,
            string.IsNullOrWhiteSpace(reason) ? request.RequestNumber : $"{request.RequestNumber}: {reason.Trim()}");

        if (wasInReview)
            await _notifications.CreateForRoleAsync(UserRole.InventoryOfficer,
                NotificationType.General,
                "Department Request Cancelled",
                $"Request {request.RequestNumber} was cancelled by {request.Department.Name}.",
                request.Id, "ProcurementRequest");

        return _mapper.Map<ProcurementRequestDto>(request);
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

        // Department requests go to Inventory first: it checks stock and
        // allocates. Procurement only hears about it if stock runs short.
        await _notifications.CreateForRoleAsync(UserRole.InventoryOfficer,
            NotificationType.ProcurementSubmitted,
            "Department Request Needs Inventory Review",
            $"Department request {request.RequestNumber} has been submitted. Please check stock and allocate quantities.",
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

        // Only requests that are in the review chain can be acted on. Without this
        // a Reject/Return would overwrite a Delivered or PO-generated request.
        if (request.Status is not (ProcurementStatus.SubmittedToProcurement
                                   or ProcurementStatus.ApprovedByProcurement
                                   or ProcurementStatus.ApprovedByInventoryOfficer))
            throw new InvalidOperationException($"This request is {request.Status} and can no longer be reviewed.");

        if (action != ApprovalAction.Approved && string.IsNullOrWhiteSpace(dto.Remarks))
            throw new InvalidOperationException("Remarks are required when rejecting or returning a request.");

        var isAdmin = approver.Role is UserRole.HospitalAdministrator or UserRole.SuperAdmin;

        // Department requests follow PPH's chain: Inventory checks stock and
        // allocates → Administrator gives final approval → the system releases.
        // An administrator may stand in for Inventory at the first step.
        var newStatus = (action, request.Status) switch
        {
            (ApprovalAction.Rejected, _) => ProcurementStatus.Rejected,
            (ApprovalAction.ReturnedForRevision, _) => ProcurementStatus.ReturnedForRevision,
            (ApprovalAction.Approved, ProcurementStatus.SubmittedToProcurement or ProcurementStatus.ApprovedByProcurement)
                when approver.Role == UserRole.InventoryOfficer || isAdmin => ProcurementStatus.ApprovedByInventoryOfficer,
            (ApprovalAction.Approved, ProcurementStatus.ApprovedByInventoryOfficer)
                when isAdmin => ProcurementStatus.FullyApproved,
            _ => throw new InvalidOperationException(
                request.Status == ProcurementStatus.ApprovedByInventoryOfficer
                    ? "Final approval of this request belongs to the Hospital Administrator."
                    : "Department requests are reviewed by the Inventory Officer first.")
        };

        if (newStatus == ProcurementStatus.ApprovedByInventoryOfficer)
            ApplyAllocations(request, dto.Allocations);

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

        request.Status = newStatus;
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var notifType = action == ApprovalAction.Approved
            ? NotificationType.ProcurementApproved
            : action == ApprovalAction.Rejected
                ? NotificationType.ProcurementRejected
                : NotificationType.ProcurementReturnedForRevision;

        var adjusted = newStatus == ProcurementStatus.ApprovedByInventoryOfficer
            && request.Items.Any(i => i.QuantityApproved < i.QuantityRequested);
        await _notifications.CreateAsync(request.RequestedByUserId, notifType,
            $"Request {action}",
            $"Your request {request.RequestNumber} was {action} by {approver.FirstName} {approver.LastName}" +
            (adjusted ? " — some quantities were adjusted to the stock available." : "."),
            id, "ProcurementRequest");

        await _audit.LogAsync(approverId, $"Procurement{action}", "ProcurementRequest", id, dto.Remarks);

        if (newStatus == ProcurementStatus.ApprovedByInventoryOfficer)
            await _notifications.CreateForRoleAsync(UserRole.HospitalAdministrator,
                NotificationType.ProcurementSubmitted,
                "Request Awaiting Final Approval",
                $"Request {request.RequestNumber} ({request.Department.Name}) passed inventory review and needs your approval.",
                id, "ProcurementRequest");

        // Final approval: no second data entry — the approved quantities are
        // issued straight away when the storeroom has them.
        if (newStatus == ProcurementStatus.FullyApproved)
            await TryReleaseAsync(request, approverId, notifyOnShortage: true);

        return _mapper.Map<ProcurementRequestDto>(await BaseQuery().FirstAsync(r => r.Id == id));
    }

    // Sets each line's approved quantity from the Inventory Officer's
    // allocation. Lines not mentioned keep an allocation saved earlier from the
    // allocation board, or default to the full requested quantity.
    private static void ApplyAllocations(ProcurementRequest request, List<LineAllocationDto>? allocations)
    {
        var map = (allocations ?? [])
            .GroupBy(a => a.ProcurementRequestItemId)
            .ToDictionary(g => g.Key, g => g.Last().QuantityApproved);

        foreach (var line in request.Items)
        {
            if (map.TryGetValue(line.Id, out var qty))
            {
                if (qty < 0 || qty > line.QuantityRequested)
                    throw new InvalidOperationException(
                        $"{line.InventoryItem.Name}: allocation must be between 0 and the {line.QuantityRequested} requested.");
                line.QuantityApproved = qty;
            }
            else
            {
                line.QuantityApproved ??= line.QuantityRequested;
            }
        }

        if (request.Items.All(i => i.QuantityApproved <= 0))
            throw new InvalidOperationException("Nothing was allocated. Reject or return the request instead.");
    }

    // Manual retry for a fully approved request that was waiting on stock.
    public async Task<ProcurementRequestDto?> ReleaseAsync(int id, string userId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) return null;
        if (request.Status != ProcurementStatus.FullyApproved)
            throw new InvalidOperationException("Only fully approved requests that have not been released can be released.");

        var shortages = await TryReleaseAsync(request, userId, notifyOnShortage: false);
        if (shortages.Count > 0)
            throw new InvalidOperationException("Not enough stock to release yet: " + string.Join("; ", shortages) + ".");

        return _mapper.Map<ProcurementRequestDto>(await BaseQuery().FirstAsync(r => r.Id == id));
    }

    // Checks central stock for every approved line and, only if all of it is
    // there, issues it to the requesting department in one transaction:
    // central stock down, department stock up, request → Released. Returns
    // the shortages (empty on success). A request is released whole or not at
    // all, so the department never receives half an order silently.
    private async Task<List<string>> TryReleaseAsync(ProcurementRequest request, string userId, bool notifyOnShortage)
    {
        var lines = request.Items
            .Select(i => (Line: i, Qty: i.QuantityApproved ?? i.QuantityRequested))
            .Where(x => x.Qty > 0)
            .ToList();

        var shortages = lines
            .Where(x => x.Line.InventoryItem.QuantityOnHand < x.Qty)
            .Select(x => $"{x.Line.InventoryItem.Name} needs {x.Qty:0.##} {x.Line.InventoryItem.Unit}, " +
                         $"{x.Line.InventoryItem.QuantityOnHand:0.##} on hand")
            .ToList();
        if (!request.Department.IsActive)
            shortages.Add($"{request.Department.Name} is inactive");

        if (shortages.Count == 0)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                foreach (var (line, qty) in lines)
                {
                    // Reuses the ordinary issuance path so FEFO batch draw-down,
                    // the department ledger, consumption records and low-stock
                    // alerts all behave exactly like a manual issuance.
                    await _stockMovements.CreateAsync(new CreateStockMovementDto
                    {
                        InventoryItemId = line.InventoryItemId,
                        MovementType = StockMovementType.Issuance,
                        Quantity = qty,
                        DepartmentId = request.DepartmentId,
                        Remarks = $"Released for request {request.RequestNumber}"
                    }, userId);
                    line.QuantityReleased = qty;
                }

                request.Status = ProcurementStatus.Released;
                request.ReleasedAt = DateTime.UtcNow;
                request.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (InvalidOperationException ex)
            {
                // Drop the half-applied entity changes so nothing later in this
                // request flushes them; the request stays FullyApproved.
                await tx.RollbackAsync();
                _db.ChangeTracker.Clear();
                shortages.Add(ex.Message);
            }
        }

        if (shortages.Count == 0)
        {
            await _audit.LogAsync(userId, "ProcurementReleased", "ProcurementRequest", request.Id, request.RequestNumber);
            await _notifications.CreateAsync(request.RequestedByUserId, NotificationType.ProcurementApproved,
                "Supplies Released",
                $"The items on {request.RequestNumber} were released and added to {request.Department.Name}'s stock.",
                request.Id, "ProcurementRequest");
        }
        else if (notifyOnShortage)
        {
            // Insufficient stock: this is where the cycle hands over to
            // Procurement to replenish, and Inventory releases once it lands.
            var detail = string.Join("; ", shortages);
            await _notifications.CreateForRoleAsync(UserRole.ProcurementStaff, NotificationType.LowStock,
                "Replenishment Needed",
                $"Approved request {request.RequestNumber} ({request.Department.Name}) cannot be released: {detail}.",
                request.Id, "ProcurementRequest");
            await _notifications.CreateForRoleAsync(UserRole.InventoryOfficer, NotificationType.LowStock,
                "Approved Request Awaiting Stock",
                $"{request.RequestNumber} is fully approved but short: {detail}. Release it once stock arrives.",
                request.Id, "ProcurementRequest");
        }

        return shortages;
    }

    // ── Fair-share allocation ───────────────────────────────────────────────

    public async Task<IEnumerable<ItemAllocationDto>> GetAllocationOverviewAsync()
    {
        // Lists, not the static arrays: C# 14 binds array.Contains to the span
        // overload inside expression trees, which EF Core cannot translate.
        var awaiting = AwaitingInventoryStatuses.ToList();
        var reserving = ReservingStatuses.ToList();
        var pending = await _db.ProcurementRequestItems
            .Include(i => i.ProcurementRequest).ThenInclude(r => r.Department)
            .Include(i => i.InventoryItem).ThenInclude(ii => ii.Category)
            .Where(i => awaiting.Contains(i.ProcurementRequest.Status))
            .AsNoTracking()
            .ToListAsync();

        var itemIds = pending.Select(p => p.InventoryItemId).Distinct().ToList();
        var reserved = await _db.ProcurementRequestItems
            .Where(i => itemIds.Contains(i.InventoryItemId) && reserving.Contains(i.ProcurementRequest.Status))
            .GroupBy(i => i.InventoryItemId)
            .Select(g => new { g.Key, Qty = g.Sum(i => i.QuantityApproved ?? i.QuantityRequested) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);

        return pending
            .GroupBy(p => p.InventoryItemId)
            .Select(g =>
            {
                var item = g.First().InventoryItem;
                var held = reserved.GetValueOrDefault(g.Key);
                var available = Math.Max(0, item.QuantityOnHand - held);
                // First come, first listed; also the tie-breaker for spare units.
                var lines = g.OrderBy(l => l.ProcurementRequest.RequestedAt).ToList();
                var shares = FairShare(available, lines.Select(l => l.QuantityRequested).ToList());
                return new ItemAllocationDto
                {
                    InventoryItemId = item.Id,
                    ItemName = item.Name,
                    ItemCode = item.ItemCode,
                    CategoryName = item.Category?.Name,
                    Unit = item.Unit,
                    QuantityOnHand = item.QuantityOnHand,
                    Reserved = held,
                    Available = available,
                    TotalRequested = lines.Sum(l => l.QuantityRequested),
                    Lines = lines.Select((l, idx) => new AllocationLineDto
                    {
                        ProcurementRequestItemId = l.Id,
                        ProcurementRequestId = l.ProcurementRequestId,
                        RequestNumber = l.ProcurementRequest.RequestNumber,
                        DepartmentName = l.ProcurementRequest.Department.Name,
                        RequestedAt = l.ProcurementRequest.RequestedAt,
                        QuantityRequested = l.QuantityRequested,
                        QuantityApproved = l.QuantityApproved,
                        FairShare = shares[idx]
                    }).ToList()
                };
            })
            .OrderByDescending(a => a.IsShort)
            .ThenBy(a => a.ItemName)
            .ToList();
    }

    // Proportional split of the available stock across competing requests.
    // With whole-unit quantities it uses largest-remainder rounding so the
    // shares add up exactly to what is available (e.g. 80 gloves against
    // 30/20/40 → 27/18/35). Nobody is ever given more than they asked for.
    public static List<decimal> FairShare(decimal available, List<decimal> requested)
    {
        var total = requested.Sum();
        if (total <= available) return requested.ToList();
        if (available <= 0 || total <= 0) return requested.Select(_ => 0m).ToList();

        var wholeUnits = requested.All(q => q == Math.Floor(q));
        if (!wholeUnits)
            return requested.Select(q => Math.Round(available * q / total, 2, MidpointRounding.ToZero)).ToList();

        var pool = Math.Floor(available);
        var exact = requested.Select(q => pool * q / total).ToList();
        var shares = exact.Select(Math.Floor).ToList();
        var spare = pool - shares.Sum();
        foreach (var idx in Enumerable.Range(0, requested.Count)
                     .OrderByDescending(i => exact[i] - shares[i])
                     .ThenBy(i => i))
        {
            if (spare <= 0) break;
            if (shares[idx] >= requested[idx]) continue;
            shares[idx] += 1;
            spare -= 1;
        }
        return shares;
    }

    // Saves the Inventory Officer's allocation across many requests at once
    // (the allocation board) without approving them; the review of each
    // request then starts from these figures.
    public async Task SaveAllocationsAsync(SaveAllocationsDto dto, string userId)
    {
        var ids = dto.Lines.Select(l => l.ProcurementRequestItemId).Distinct().ToList();
        var lines = await _db.ProcurementRequestItems
            .Include(i => i.ProcurementRequest)
            .Include(i => i.InventoryItem)
            .Where(i => ids.Contains(i.Id))
            .ToListAsync();
        if (lines.Count != ids.Count)
            throw new InvalidOperationException("One or more request lines no longer exist.");

        foreach (var input in dto.Lines)
        {
            var line = lines.First(l => l.Id == input.ProcurementRequestItemId);
            if (!AwaitingInventoryStatuses.Contains(line.ProcurementRequest.Status))
                throw new InvalidOperationException(
                    $"{line.ProcurementRequest.RequestNumber} is no longer awaiting inventory review.");
            if (input.QuantityApproved > line.QuantityRequested)
                throw new InvalidOperationException(
                    $"{line.InventoryItem.Name} on {line.ProcurementRequest.RequestNumber}: allocation exceeds the {line.QuantityRequested} requested.");
            line.QuantityApproved = input.QuantityApproved;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, "AllocationSaved", "ProcurementRequest", null,
            $"{dto.Lines.Count} line(s) across {lines.Select(l => l.ProcurementRequestId).Distinct().Count()} request(s)");
    }

    public async Task<PurchaseOrderDto> GeneratePurchaseOrderAsync(int requestId, GeneratePurchaseOrderDto dto, string userId)
    {
        var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == requestId)
            ?? throw new InvalidOperationException("Request not found.");

        if (request.Status != ProcurementStatus.FullyApproved)
            throw new InvalidOperationException("Request is not fully approved.");

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
        // committed, and it is the first point where real costs
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
            .Include(p => p.GeneratedByUser)
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstAsync(p => p.Id == po.Id));
    }

    public async Task<PurchaseOrderDto?> GetPurchaseOrderAsync(int id)
    {
        var po = await _db.PurchaseOrders
            .Include(p => p.ProcurementRequest)
            .Include(p => p.GeneratedByUser)
            .Include(p => p.Items).ThenInclude(i => i.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == id);
        return po is null ? null : _mapper.Map<PurchaseOrderDto>(po);
    }

    public async Task<IEnumerable<PurchaseOrderDto>> GetAllPurchaseOrdersAsync()
    {
        var pos = await _db.PurchaseOrders
            .Include(p => p.ProcurementRequest)
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
            var batch = new ItemBatch
            {
                InventoryItemId = item.InventoryItemId,
                Quantity = received,
                RemainingQuantity = received,
                LotNumber = string.IsNullOrWhiteSpace(details?.LotNumber) ? null : details!.LotNumber!.Trim(),
                ExpirationDate = details?.ExpirationDate,
                UnitCost = item.UnitCost, // carries acquisition cost for valuation
                PurchaseOrderId = purchaseOrderId,
                ReceivedDate = DateTime.UtcNow
            };
            _db.ItemBatches.Add(batch);

            _db.StockMovements.Add(new StockMovement
            {
                InventoryItemId = item.InventoryItemId,
                MovementType = StockMovementType.Receipt,
                Quantity = received,
                QuantityBeforeMovement = invItem.QuantityOnHand - received,
                QuantityAfterMovement = invItem.QuantityOnHand,
                Remarks = $"Received via PO {po.PONumber}",
                PerformedByUserId = userId,
                PurchaseOrderId = purchaseOrderId,
                ItemBatch = batch
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

        // The replenishment the department was waiting on has landed: close
        // the cycle by releasing its approved quantities. Saved above first, so
        // a failed release can never roll the delivery back. Only requests that
        // went through inventory allocation qualify — older requests may have
        // been issued by hand already.
        if (fullyDelivered)
        {
            var request = await BaseQuery().FirstOrDefaultAsync(r => r.Id == po.ProcurementRequestId);
            if (request is not null && request.Items.Any(i => i.QuantityApproved != null))
                await TryReleaseAsync(request, userId, notifyOnShortage: false);
        }

        await _notifications.BroadcastStockChangedAsync();
        return true;
    }
}
