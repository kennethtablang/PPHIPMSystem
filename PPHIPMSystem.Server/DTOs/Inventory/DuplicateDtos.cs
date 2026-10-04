using System.ComponentModel.DataAnnotations;

namespace PPHIPMSystem.Server.DTOs.Inventory;

// One item as shown in a duplicate group or a "similar items" warning.
public class DuplicateItemDto
{
    public int Id { get; set; }
    public string? ItemCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public string Unit { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal QuantityOnHand { get; set; }
    public DateTime CreatedAt { get; set; }
    // Set only by the similar-items check: true when saving would be refused.
    public bool IsExactMatch { get; set; }
}

// Items the system believes are the same item entered more than once.
public class DuplicateGroupDto
{
    // "Exact" = same category, name, brand and unit once spelling is ignored;
    // "Similar" = same words, unit and compatible brand, but differing details.
    public string MatchType { get; set; } = string.Empty;
    // What differs between the items, to help the reviewer decide.
    public List<string> Differences { get; set; } = [];
    public List<DuplicateItemDto> Items { get; set; } = [];
}

public class MergeItemsDto
{
    // The record that survives; the others are folded into it and deactivated.
    [Required]
    public int KeepItemId { get; set; }

    [Required, MinLength(1)]
    public List<int> MergeItemIds { get; set; } = [];
}

public class MergeResultDto
{
    public int KeptItemId { get; set; }
    public int MergedCount { get; set; }
    public decimal NewQuantityOnHand { get; set; }
}
