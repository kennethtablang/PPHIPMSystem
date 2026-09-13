using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Batch;

public class CreateItemBatchDto
{
    [Range(1, int.MaxValue)]
    public int InventoryItemId { get; set; }

    [MaxLength(100)]
    public string? LotNumber { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal Quantity { get; set; }

    public DateTime? ExpirationDate { get; set; }

    // Optional acquisition cost per unit for valuation reporting.
    [Range(0, 1_000_000_000)]
    public decimal? UnitCost { get; set; }

    [Range(1, int.MaxValue)]
    public int? PurchaseOrderId { get; set; }
}

public class BulkDisposalResultDto
{
    public int BatchesDisposed { get; set; }
    public decimal TotalQuantity { get; set; }
}

// Replenishing several items in one pass (Inventory → Replenish Selected).
// Every line is validated before anything is written, so the whole receipt
// either lands or it doesn't — no half-applied stock increases.
public class BulkReceiveBatchesDto
{
    [MinLength(1, ErrorMessage = "At least one line is required.")]
    [MaxLength(200, ErrorMessage = "A single receipt is limited to 200 lines.")]
    public List<CreateItemBatchDto> Batches { get; set; } = new();
}

public class BulkReceiveResultDto
{
    public int BatchesCreated { get; set; }
    public decimal TotalQuantity { get; set; }
}

// Correction of details captured at receiving — lot/expiry typos happen and
// wrong expiry dates poison FEFO ordering and expiration warnings.
public class UpdateItemBatchDetailsDto
{
    [MaxLength(100)]
    public string? LotNumber { get; set; }

    public DateTime? ExpirationDate { get; set; }
}
