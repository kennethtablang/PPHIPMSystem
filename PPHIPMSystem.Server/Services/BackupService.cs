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
        total += AddSheet(wb, "Suppliers", await _db.Suppliers.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ProcurementRequests", await _db.ProcurementRequests.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ProcurementRequestItems", await _db.ProcurementRequestItems.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "ProcurementApprovals", await _db.ProcurementApprovals.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "PurchaseOrders", await _db.PurchaseOrders.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "PurchaseOrderItems", await _db.PurchaseOrderItems.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "DemandForecasts", await _db.DemandForecasts.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "Notifications", await _db.Notifications.AsNoTracking().ToListAsync());
        total += AddSheet(wb, "AuditLogs", await _db.AuditLogs.AsNoTracking().ToListAsync());

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
            try { if (File.Exists(b.FilePath)) File.Delete(b.FilePath); }
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

    public async Task<(byte[] Content, string FileName)?> GetFileAsync(int id)
    {
        var backup = await _db.Backups.FindAsync(id);
        if (backup is null || backup.Status != BackupStatus.Success || !File.Exists(backup.FilePath))
            return null;
        var bytes = await File.ReadAllBytesAsync(backup.FilePath);
        return (bytes, backup.FileName);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var backup = await _db.Backups.FindAsync(id);
        if (backup is null) return false;

        try { if (File.Exists(backup.FilePath)) File.Delete(backup.FilePath); }
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
    };
}
