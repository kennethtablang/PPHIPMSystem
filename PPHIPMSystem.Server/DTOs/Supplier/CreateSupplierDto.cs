using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Supplier;

public class CreateSupplierDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ContactPerson { get; set; }

    [MaxLength(100), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? AccreditationNumber { get; set; }

    public bool IsAccredited { get; set; } = true;
    public DateTime? AccreditationExpiry { get; set; }
}
