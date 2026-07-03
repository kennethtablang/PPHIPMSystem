using PPHIPMSystem.Server.DTOs.Inventory;

namespace PPHIPMSystem.Server.Interfaces;

public interface IInventoryImportService
{
    // Blank .xlsx with the expected headers and one example row.
    byte[] BuildTemplate();

    // Parse + validate only — nothing is written.
    Task<ImportResultDto> PreviewAsync(Stream xlsx);

    // Validate and create the valid rows; invalid rows are skipped and reported.
    Task<ImportResultDto> ImportAsync(Stream xlsx, string userId);
}
