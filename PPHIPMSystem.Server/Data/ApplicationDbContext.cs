using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<ItemBatch> ItemBatches => Set<ItemBatch>();
    public DbSet<ConsumptionRecord> ConsumptionRecords => Set<ConsumptionRecord>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<ProcurementRequest> ProcurementRequests => Set<ProcurementRequest>();
    public DbSet<ProcurementRequestItem> ProcurementRequestItems => Set<ProcurementRequestItem>();
    public DbSet<ProcurementApproval> ProcurementApprovals => Set<ProcurementApproval>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<DemandForecast> DemandForecasts => Set<DemandForecast>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(e =>
        {
            e.HasOne(u => u.Department)
             .WithMany(d => d.Users)
             .HasForeignKey(u => u.DepartmentId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<StockAdjustment>(e =>
        {
            e.HasOne(a => a.RequestedByUser)
             .WithMany(u => u.StockAdjustments)
             .HasForeignKey(a => a.RequestedByUserId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.ApprovedByUser)
             .WithMany()
             .HasForeignKey(a => a.ApprovedByUserId)
             .OnDelete(DeleteBehavior.Restrict);

            e.Ignore(a => a.Variance);
        });

        builder.Entity<PurchaseOrderItem>(e =>
        {
            e.Ignore(p => p.TotalCost);
        });

        builder.Entity<ItemBatch>(e =>
        {
            e.Ignore(b => b.IsExpired);
        });

        builder.Entity<ProcurementRequest>(e =>
        {
            e.HasOne(r => r.RequestedByUser)
             .WithMany(u => u.ProcurementRequests)
             .HasForeignKey(r => r.RequestedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ProcurementApproval>(e =>
        {
            e.HasOne(a => a.ApproverUser)
             .WithMany(u => u.ProcurementApprovals)
             .HasForeignKey(a => a.ApproverUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<StockMovement>(e =>
        {
            e.HasOne(m => m.PerformedByUser)
             .WithMany(u => u.StockMovements)
             .HasForeignKey(m => m.PerformedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PurchaseOrder>(e =>
        {
            e.HasOne(po => po.GeneratedByUser)
             .WithMany()
             .HasForeignKey(po => po.GeneratedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AuditLog>(e =>
        {
            e.HasOne(l => l.User)
             .WithMany(u => u.AuditLogs)
             .HasForeignKey(l => l.UserId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ConsumptionRecord>(e =>
        {
            e.HasIndex(c => new { c.InventoryItemId, c.Year, c.Month }).IsUnique();
        });

        builder.Entity<InventoryItem>(e =>
        {
            e.HasIndex(i => i.ItemCode).IsUnique().HasFilter("[ItemCode] IS NOT NULL");
        });

        builder.Entity<ProcurementRequest>(e =>
        {
            e.HasIndex(r => r.RequestNumber).IsUnique();
        });

        builder.Entity<PurchaseOrder>(e =>
        {
            e.HasIndex(po => po.PONumber).IsUnique();
        });
    }
}
