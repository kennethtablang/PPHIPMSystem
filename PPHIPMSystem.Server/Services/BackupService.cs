using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.DTOs.Backup;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Services;

public class BackupService : IBackupService
{
    private const string ScheduleKey = "BackupScheduleTime";
    private const string RetentionKey = "BackupRetentionDays";
    private const string DefaultScheduleTime = "00:00";
    private const int DefaultRetentionDays = 30;

    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<BackupService> _logger;

    public BackupService(ApplicationDbContext db, IWebHostEnvironment env, ILogger<BackupService> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    private string BackupDirectory
    {
        get
        {
            var dir = Path.Combine(_env.ContentRootPath, "Backups");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    public async Task<BackupDto> CreateBackupAsync(BackupType type, string? triggeredByUserId)
    {
        string? triggeredByName = null;
        if (!string.IsNullOrEmpty(triggeredByUserId))
        {
            var u = await _db.Users.FindAsync(triggeredByUserId);
            if (u is not null) triggeredByName = $"{u.FirstName} {u.LastName}".Trim();
        }

        var backup = new Backup
        {
            Type = type,
            TriggeredByUserId = triggeredByUserId,
            TriggeredByName = triggeredByName,
            CreatedAt = DateTime.UtcNow,
        };

        try
        {
            var fileName = $"IPMS_Backup_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
            var filePath = Path.Combine(BackupDirectory, fileName);

            var recordCount = await WriteWorkbookAsync(filePath);

            backup.FileName = fileName;
            backup.FilePath = filePath;
            backup.FileSizeBytes = new FileInfo(filePath).Length;
            backup.RecordCount = recordCount;
            backup.Status = BackupStatus.Success;

            // The workbook is a readable data export; the .bak is the actual
            // restorable database backup. A .bak failure (e.g. SQL engine can't
            // reach the folder) degrades to export-only rather than failing the run.
            await TryCreateDatabaseBackupAsync(Path.ChangeExtension(filePath, ".bak"));

            _db.Backups.Add(backup);
            await _db.SaveChangesAsync();

            CleanupOldBackups();
            _logger.LogInformation("Backup created: {File} ({Records} records).", fileName, recordCount);
        }
        catch (Exception ex)
        {
            backup.Status = BackupStatus.Failed;
            backup.ErrorMessage = ex.Message;
            _db.Backups.Add(backup);
            await _db.SaveChangesAsync();
            _logger.LogError(ex, "Backup failed.");
        }

        return ToDto(backup);
    }

    private async Task<int> WriteWorkbookAsync(string filePath)
    {
        using var wb = new XLWorkbook();
        var total = 0;

        total += AddSheet(wb, "Departments", await _db.Departments.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "Categories", await _db.Categories.AsNoTracking().ToListAsync());

        // Users: never export password hashes / security stamps.
        var users = await _db.Users.AsNoTracking().Select(u => new
        {
            u.Id, u.EmployeeId, u.FirstName, u.MiddleName, u.LastName,
            u.UserName, u.Email, u.PhoneNumber,
            Role = u.Role.ToString(), u.DepartmentId, u.IsActive,
            u.TwoFactorEnabled, u.CreatedAt, u.LastLoginAt
        }).ToListAsync();
        total += AddSheet(wb, "Users", users);

        total += AddSheet(wb, "InventoryItems", await _db.InventoryItems.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ItemBatches", await _db.ItemBatches.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ConsumptionRecords", await _db.ConsumptionRecords.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "StockMovements", await _db.StockMovements.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "StockAdjustments", await _db.StockAdjustments.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "DepartmentStocks", await _db.DepartmentStocks.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ProcurementRequests", await _db.ProcurementRequests.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ProcurementRequestItems", await _db.ProcurementRequestItems.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ProcurementApprovals", await _db.ProcurementApprovals.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "PurchaseOrders", await _db.PurchaseOrders.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "PurchaseOrderItems", await _db.PurchaseOrderItems.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "DepartmentBudgets", await _db.DepartmentBudgets.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "DemandForecasts", await _db.DemandForecasts.AsNoTracking().ToListAsync());

        // Attachment metadata only — the files themselves live on disk and are
        // covered by the SQL .bak plus the uploads folder, not by this workbook.
        total += AddSheet(wb, "RequestAttachments", await _db.RequestAttachments.AsNoTracking().ToListAsync());

        total += AddSheet(wb, "SystemSettings", await _db.SystemSettings.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "Notifications", await _db.Notifications.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "AuditLogs", await _db.AuditLogs.AsNoTracking().ToListAsync());
        // RefreshTokens are deliberately absent: they are live credentials, and
        // a workbook is the last place they should be sitting.

        wb.SaveAs(filePath);
        return total;
    }

    // Writes one sheet from a collection, emitting only scalar properties
    // (skips navigation properties). Returns the number of data rows written.
    private static int AddSheet<T>(XLWorkbook wb, string name, IReadOnlyList<T> rows)
    {
        var ws = wb.Worksheets.Add(name);
        var props = typeof(T).GetProperties()
            .Where(p => p.CanRead && IsScalar(p.PropertyType))
            .ToList();

        for (var c = 0; c < props.Count; c++)
            ws.Cell(1, c + 1).Value = props[c].Name;
        ws.Row(1).Style.Font.Bold = true;

        var r = 2;
        foreach (var row in rows)
        {
            for (var c = 0; c < props.Count; c++)
                ws.Cell(r, c + 1).Value = ToCellValue(props[c].GetValue(row));
            r++;
        }

        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();
        return rows.Count;
    }

    private static bool IsScalar(Type t)
    {
        t = Nullable.GetUnderlyingType(t) ?? t;
        return t.IsPrimitive || t.IsEnum
            || t == typeof(string) || t == typeof(decimal)
            || t == typeof(DateTime) || t == typeof(DateTimeOffset)
            || t == typeof(TimeSpan) || t == typeof(Guid);
    }

    private static XLCellValue ToCellValue(object? v) => v switch
    {
        null => string.Empty,
        string s => s,
        bool b => b,
        DateTime dt => dt,
        DateTimeOffset dto => dto.DateTime,
        byte or sbyte or short or ushort or int or uint or long or ulong or float or double or decimal
            => Convert.ToDouble(v),
        _ => v.ToString() ?? string.Empty,
    };

    private void CleanupOldBackups()
    {
        var retentionSetting = _db.SystemSettings.Find(RetentionKey);
        var retentionDays = int.TryParse(retentionSetting?.Value, out var d) ? d : DefaultRetentionDays;
        var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
        var stale = _db.Backups.Where(b => b.CreatedAt < cutoff).ToList();
        foreach (var b in stale)
        {
            try
            {
                if (File.Exists(b.FilePath)) File.Delete(b.FilePath);
                var bak = Path.ChangeExtension(b.FilePath, ".bak");
                if (File.Exists(bak)) File.Delete(bak);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not delete backup file {File}.", b.FilePath); }
        }
        if (stale.Count > 0)
        {
            _db.Backups.RemoveRange(stale);
            _db.SaveChanges();
        }
    }

    public async Task<IEnumerable<BackupDto>> GetAllAsync()
    {
        var list = await _db.Backups.AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();
        return list.Select(ToDto);
    }

    public async Task<(byte[] Content, string FileName)?> GetFileAsync(int id, string format = "xlsx")
    {
        var backup = await _db.Backups.FindAsync(id);
        if (backup is null || backup.Status != BackupStatus.Success) return null;

        var path = format == "bak" ? Path.ChangeExtension(backup.FilePath, ".bak") : backup.FilePath;
        if (!File.Exists(path)) return null;

        var bytes = await File.ReadAllBytesAsync(path);
        return (bytes, Path.GetFileName(path));
    }

    public async Task<(bool Ok, string Message)> VerifyAsync(int id)
    {
        var backup = await _db.Backups.FindAsync(id);
        if (backup is null || backup.Status != BackupStatus.Success)
            return (false, "Backup not found.");

        var bakPath = Path.ChangeExtension(backup.FilePath, ".bak");
        if (!File.Exists(bakPath))
            return (false, "No database (.bak) file exists for this backup — only the Excel data export.");

        try
        {
            await _db.Database.ExecuteSqlRawAsync("RESTORE VERIFYONLY FROM DISK = {0}", bakPath);
            return (true, $"Backup verified — {Path.GetFileName(bakPath)} is a valid, restorable database backup.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Backup verification failed for {File}.", bakPath);
            return (false, $"Verification failed: {ex.Message}");
        }
    }

    // BACKUP DATABASE runs on the SQL engine, so the folder must be writable
    // by it (true for LocalDB, which runs as the app user).
    private async Task TryCreateDatabaseBackupAsync(string bakPath)
    {
        try
        {
            var dbName = _db.Database.GetDbConnection().Database;
            await _db.Database.ExecuteSqlRawAsync(
                $"BACKUP DATABASE [{dbName}] TO DISK = {{0}} WITH INIT, COPY_ONLY", bakPath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database .bak backup failed; the Excel export was still created.");
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var backup = await _db.Backups.FindAsync(id);
        if (backup is null) return false;

        try
        {
            if (File.Exists(backup.FilePath)) File.Delete(backup.FilePath);
            var bak = Path.ChangeExtension(backup.FilePath, ".bak");
            if (File.Exists(bak)) File.Delete(bak);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Could not delete backup file {File}.", backup.FilePath); }

        _db.Backups.Remove(backup);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<string> GetScheduleTimeAsync()
    {
        var setting = await _db.SystemSettings.FindAsync(ScheduleKey);
        return setting?.Value ?? DefaultScheduleTime;
    }

    public async Task SetScheduleTimeAsync(string time)
    {
        var setting = await _db.SystemSettings.FindAsync(ScheduleKey);
        if (setting is null)
            _db.SystemSettings.Add(new SystemSetting { Key = ScheduleKey, Value = time });
        else
            setting.Value = time;
        await _db.SaveChangesAsync();
    }

    private static BackupDto ToDto(Backup b) => new()
    {
        Id = b.Id,
        FileName = b.FileName,
        FileSizeBytes = b.FileSizeBytes,
        RecordCount = b.RecordCount,
        Type = b.Type,
        Status = b.Status,
        ErrorMessage = b.ErrorMessage,
        TriggeredByName = b.TriggeredByName,
        CreatedAt = b.CreatedAt,
        HasDatabaseFile = !string.IsNullOrEmpty(b.FilePath) && File.Exists(Path.ChangeExtension(b.FilePath, ".bak")),
    };
}
