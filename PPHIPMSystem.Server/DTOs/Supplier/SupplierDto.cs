namespace PPHIPMSystem.Server.DTOs.Supplier;

public class SupplierDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? AccreditationNumber { get; set; }
    public bool IsAccredited { get; set; }
    public DateTime? AccreditationExpiry { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int TotalOrders { get; set; }
}

// Performance figures derived from purchase-order history.
public class SupplierMetricsDto
{
    public int SupplierId { get; set; }
    public int PoCount { get; set; }
    public int DeliveredCount { get; set; }
    public decimal TotalAmount { get; set; }
    // Average days from PO generation to confirmed delivery (delivered POs only).
    public double? AvgLeadTimeDays { get; set; }
}
