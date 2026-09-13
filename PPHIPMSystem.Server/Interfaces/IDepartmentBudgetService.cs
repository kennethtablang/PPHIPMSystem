using PPHIPMSystem.Server.DTOs.Budget;

namespace PPHIPMSystem.Server.Interfaces;

public interface IDepartmentBudgetService
{
    // One row per department for the year (budgeted or not), or a single
    // department when departmentId is given.
    Task<IEnumerable<DepartmentBudgetDto>> GetAllAsync(int fiscalYear, int? departmentId);

    Task<DepartmentBudgetDto> UpsertAsync(UpsertDepartmentBudgetDto dto, string userId);
    Task<bool> DeleteAsync(int id, string userId);

    // Weighs an amount against what the department has left this year.
    Task<BudgetCheckDto> EvaluateAsync(int departmentId, int fiscalYear, decimal proposedAmount);

    // Same, for a procurement request valued at its estimated unit costs —
    // what approvers see before sending a request further up the chain.
    Task<BudgetCheckDto?> CheckRequestAsync(int requestId);
}
