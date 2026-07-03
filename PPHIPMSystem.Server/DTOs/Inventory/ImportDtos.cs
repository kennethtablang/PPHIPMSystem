namespace PPHIPMSystem.Server.DTOs.Inventory;

// One spreadsheet row, parsed and validated.
public class ImportRowDto
{
    public int Row { get; set; }
    public string? Name { get; set; }
    public string? ItemCode { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public string? Category { get; set; }
    public decimal ReorderThreshold { get; set; }
    public int ExpirationWarningDays { get; set; }
    public bool IsValid => Errors.Count == 0;
    public List<string> Errors { get; set; } = [];
}

public class ImportResultDto
{
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public List<ImportRowDto> Rows { get; set; } = [];
}
