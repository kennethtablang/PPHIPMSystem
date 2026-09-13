using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Budget;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

// Department appropriations per fiscal year (calendar year, matching the LGU
// annual budget cycle) and the spend measured against them.
//
// Spend is never stored: it is summed from the purchase orders raised against
// the department's requests, so a voided or amended PO can't leave a stale
// "consumed" figure behind. A department with no budget row is unbudgeted —
// nothing is checked and nothing is blocked for it.
public class DepartmentBudgetService : IDepartmentBudgetService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditLogService _audit;
    private readonly ISystemSettingsService _settings;

    public DepartmentBudgetService(ApplicationDbContext db, IAuditLogService audit, ISystemSettingsService settings)
    {
        _db = db;
        _audit = audit;
        _settings = settings;
    }

    // Requests that are alive in the approval chain but have no PO yet. Their
    // estimated value is shown as "pending" so an approver can see what is
    // already queued against the same pot of money.
    //
    // A List, not an array: on an array `Contains` binds to the ReadOnlySpan
    // overload, which EF can't translate into a SQL IN clause.
    private static readonly List<ProcurementStatus> PendingStatuses =
    [
        ProcurementStatus.SubmittedByDepartment,
        ProcurementStatus.SubmittedToProcurement,
        ProcurementStatus.ApprovedByProcurement,
        ProcurementStatus.ApprovedByInventoryOfficer,
        ProcurementStatus.FullyApproved,
        ProcurementStatus.ReturnedForRevision,
    ];

    public async Task<IEnumerable<DepartmentBudgetDto>> GetAllAsync(int fiscalYear, int? departmentId)
    {
        var departments = await _db.Departments.AsNoTracking()
            .Where(d => departmentId == null || d.Id == departmentId)
            // Inactive departments still appear if they hold a budget row for
            // the year, so their spend never silently vanishes from the sheet.
            .Where(d => d.IsActive || _db.DepartmentBudgets.Any(b => b.DepartmentId == d.Id && b.FiscalYear == fiscalYear))
            .OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name })
            .ToListAsync();

        var budgets = await _db.DepartmentBudgets.AsNoTracking()
            .Where(b => b.FiscalYear == fiscalYear)
            .ToDictionaryAsync(b => b.DepartmentId);

        // One grouped pass each for committed and pending, instead of two
        // queries per department.
        var committed = await _db.PurchaseOrders.AsNoTracking()
            .Where(p => p.GeneratedAt.Year == fiscalYear)
            .GroupBy(p => p.ProcurementRequest.DepartmentId)
            .Select(g => new { DepartmentId = g.Key, Total = g.Sum(p => p.TotalAmount), Count = g.Count() })
            .ToDictionaryAsync(x => x.DepartmentId);

        // Summed over the request lines directly rather than as a nested
        // aggregate inside a grouped request query — flat translates to SQL.
        var pending = await _db.ProcurementRequestItems.AsNoTracking()
            .Where(i => i.ProcurementRequest.RequestedAt.Year == fiscalYear
                        && PendingStatuses.Contains(i.ProcurementRequest.Status))
            .GroupBy(i => i.ProcurementRequest.DepartmentId)
            .Select(g => new
            {
                DepartmentId = g.Key,
                Total = g.Sum(i => i.QuantityRequested * (i.EstimatedUnitCost ?? 0))
            })
            .ToDictionaryAsync(x => x.DepartmentId, x => x.Total);

        return departments.Select(d =>
        {
            var budget = budgets.GetValueOrDefault(d.Id);
            var spend = committed.GetValueOrDefault(d.Id);
            return new DepartmentBudgetDto
            {
                Id = budget?.Id,
                DepartmentId = d.Id,
                DepartmentName = d.Name,
                FiscalYear = fiscalYear,
                HasBudget = budget is not null,
                Amount = budget?.Amount ?? 0,
                Notes = budget?.Notes,
                Committed = spend?.Total ?? 0,
                PurchaseOrderCount = spend?.Count ?? 0,
                Pending = pending.GetValueOrDefault(d.Id),
                UpdatedAt = budget?.UpdatedAt,
            };
        }).ToList();
    }

    public async Task<DepartmentBudgetDto> UpsertAsync(UpsertDepartmentBudgetDto dto, string userId)
    {
        var department = await _db.Departments.FindAsync(dto.DepartmentId)
            ?? throw new InvalidOperationException("Department not found.");

        var existing = await _db.DepartmentBudgets.FirstOrDefaultAsync(b =>
            b.DepartmentId == dto.DepartmentId && b.FiscalYear == dto.FiscalYear);

        var notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        var budget = existing;
        string action, details;

        if (budget is null)
        {
            budget = new DepartmentBudget
            {
                DepartmentId = dto.DepartmentId,
                FiscalYear = dto.FiscalYear,
                Amount = dto.Amount,
                Notes = notes,
            };
            _db.DepartmentBudgets.Add(budget);
            action = "DepartmentBudgetCreated";
            details = $"{department.Name} FY{dto.FiscalYear}: ₱{dto.Amount:N2}";
        }
        else
        {
            // The previous figure is the point of the log entry — a budget being
            // raised mid-year is exactly what an auditor comes looking for.
            details = $"{department.Name} FY{dto.FiscalYear}: ₱{budget.Amount:N2} → ₱{dto.Amount:N2}";
            action = "DepartmentBudgetUpdated";
            budget.Amount = dto.Amount;
            budget.Notes = notes;
            budget.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, action, "DepartmentBudget", budget.Id, details);

        var rows = await GetAllAsync(dto.FiscalYear, dto.DepartmentId);
        return rows.First();
    }

    public async Task<bool> DeleteAsync(int id, string userId)
    {
        var budget = await _db.DepartmentBudgets.Include(b => b.Department)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (budget is null) return false;

        _db.DepartmentBudgets.Remove(budget);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(userId, "DepartmentBudgetDeleted", "DepartmentBudget", id,
            $"{budget.Department.Name} FY{budget.FiscalYear}");
        return true;
    }

    public async Task<BudgetCheckDto> EvaluateAsync(int departmentId, int fiscalYear, decimal proposedAmount)
    {
        var department = await _db.Departments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == departmentId)
            ?? throw new InvalidOperationException("Department not found.");

        var budget = await _db.DepartmentBudgets.AsNoTracking()
            .FirstOrDefaultAsync(b => b.DepartmentId == departmentId && b.FiscalYear == fiscalYear);

        var committed = await _db.PurchaseOrders.AsNoTracking()
            .Where(p => p.ProcurementRequest.DepartmentId == departmentId && p.GeneratedAt.Year == fiscalYear)
            .SumAsync(p => (decimal?)p.TotalAmount) ?? 0;

        return new BudgetCheckDto
        {
            DepartmentId = departmentId,
            DepartmentName = department.Name,
            FiscalYear = fiscalYear,
            HasBudget = budget is not null,
            Amount = budget?.Amount ?? 0,
            Committed = committed,
            ProposedAmount = proposedAmount,
            Enforced = await _settings.GetEnforceDepartmentBudgetAsync(),
        };
    }

    public async Task<BudgetCheckDto?> CheckRequestAsync(int requestId)
    {
        var request = await _db.ProcurementRequests.AsNoTracking()
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == requestId);
        if (request is null) return null;

        // Estimated value: what the requester priced the lines at. The real
        // figure is only known when procurement enters supplier costs on the PO.
        var estimate = request.Items.Sum(i => i.QuantityRequested * (i.EstimatedUnitCost ?? 0));
        return await EvaluateAsync(request.DepartmentId, request.RequestedAt.Year, estimate);
    }
}
