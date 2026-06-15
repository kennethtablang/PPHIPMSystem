using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Department;

public class CreateDepartmentDto
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }
}
