using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;

namespace PPHIPMSystem.Server.Controllers;

// Global search for the topbar: a few best matches per entity type.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private const int MaxPerGroup = 5;
    private readonly ApplicationDbContext _db;

    public SearchController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        q = (q ?? "").Trim();
        if (q.Length < 2)
            return Ok(new { items = Array.Empty<object>(), requests = Array.Empty<object>(), purchaseOrders = Array.Empty<object>(), users = Array.Empty<object>() });

        var items = await _db.InventoryItems.AsNoTracking()
            .Where(i => i.IsActive && (i.Name.Contains(q) || (i.ItemCode != null && i.ItemCode.Contains(q))))
            .OrderBy(i => i.Name)
            .Take(MaxPerGroup)
            .Select(i => new { i.Id, Title = i.Name, Subtitle = i.ItemCode ?? i.Unit })
            .ToListAsync();

        // Department heads only see their own department's requests and have no
        // access to purchase orders (same scoping as ProcurementController).
        var isDeptHead = User.IsInRole("DepartmentHead") || User.IsInRole("DepartmentStaff");
        int? ownDeptId = int.TryParse(User.FindFirstValue("departmentId"), out var d) ? d : null;

        var requests = await _db.ProcurementRequests.AsNoTracking()
            .Where(r => r.RequestNumber.Contains(q))
            .Where(r => !isDeptHead || r.DepartmentId == ownDeptId)
            .OrderByDescending(r => r.RequestedAt)
            .Take(MaxPerGroup)
            .Select(r => new { r.Id, Title = r.RequestNumber, Subtitle = r.Status.ToString() })
            .ToListAsync();

        var purchaseOrders = await _db.PurchaseOrders.AsNoTracking()
            .Where(p => !isDeptHead && p.PONumber.Contains(q))
            .OrderByDescending(p => p.GeneratedAt)
            .Take(MaxPerGroup)
            .Select(p => new { p.Id, Title = p.PONumber, Subtitle = p.IsDelivered ? "Delivered" : "Pending delivery" })
            .ToListAsync();

        // User accounts are admin-only information.
        var isAdmin = User.IsInRole("SuperAdmin") || User.IsInRole("HospitalAdministrator");
        object users = Array.Empty<object>();
        if (isAdmin)
            users = await _db.Users.AsNoTracking()
                .Where(u => u.IsActive && (u.FirstName.Contains(q) || u.LastName.Contains(q) || (u.UserName != null && u.UserName.Contains(q))))
                .OrderBy(u => u.LastName)
                .Take(MaxPerGroup)
                .Select(u => new { Id = u.Id, Title = u.FirstName + " " + u.LastName, Subtitle = u.UserName ?? "" })
                .ToListAsync();

        return Ok(new { items, requests, purchaseOrders, users });
    }
}
