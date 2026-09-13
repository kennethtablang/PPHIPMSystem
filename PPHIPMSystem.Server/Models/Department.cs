using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.Models;

public class Department
{
    public int Id { get; set; }

    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }

    // Name of the officer heading the department, as it should appear on LGU
    // paperwork. Free text on purpose: the head is often not a system user.
    [MaxLength(150)]
    public string? HeadOfDepartment { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ApplicationUser> Users { get; set; } = [];
    public ICollection<ProcurementRequest> ProcurementRequests { get; set; } = [];
}
