using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Data.Seeders;

/// <summary>
/// Seeds comprehensive mock data so all features of the system can be tested.
/// Runs AFTER DataSeeder (users, departments, categories, suppliers must exist).
/// </summary>
public static class MockDataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Pre-condition: base data must exist
        if (!await db.Categories.AnyAsync() || !await db.Users.AnyAsync())
            return;

        // Idempotency guard
        if (await db.InventoryItems.AnyAsync())
            return;

        var categories  = await db.Categories.ToListAsync();
        var suppliers   = await db.Suppliers.ToListAsync();
        var users       = await db.Users.ToListAsync();
        var departments = await db.Departments.ToListAsync();

        var invUser  = users.First(u => u.Role == UserRole.InventoryOfficer);
        var deptHead = users.First(u => u.Role == UserRole.DepartmentHead);

        // ────────────────────────────────────────────────────
        // 1. INVENTORY ITEMS
        // ────────────────────────────────────────────────────
        var catOral   = categories.First(c => c.Name.Contains("Oral"));
        var catInject = categories.First(c => c.Name.Contains("Injectable"));
        var catPPE    = categories.First(c => c.Name.Contains("Personal Protective"));
        var catLab    = categories.First(c => c.Name.Contains("Reagents"));
        var catClean  = categories.First(c => c.Name.Contains("Cleaning"));
        var catSurg   = categories.First(c => c.Name.Contains("Medical-Surgical"));

        var items = new List<InventoryItem>
        {
            new() { ItemCode = "MED-001", Name = "Paracetamol 500mg Tablet",        Unit = "Box of 100", CategoryId = catOral.Id,   ReorderThreshold = 50,  QuantityOnHand = 0 },
            new() { ItemCode = "MED-002", Name = "Amoxicillin 500mg Capsule",        Unit = "Box of 100", CategoryId = catOral.Id,   ReorderThreshold = 30,  QuantityOnHand = 0 },
            new() { ItemCode = "MED-003", Name = "Metformin 500mg Tablet",           Unit = "Box of 100", CategoryId = catOral.Id,   ReorderThreshold = 20,  QuantityOnHand = 0 },
            new() { ItemCode = "MED-004", Name = "Losartan 50mg Tablet",             Unit = "Box of 100", CategoryId = catOral.Id,   ReorderThreshold = 20,  QuantityOnHand = 0 },
            new() { ItemCode = "INJ-001", Name = "Epinephrine 1mg/ml Ampoule",       Unit = "Ampoule",    CategoryId = catInject.Id, ReorderThreshold = 100, QuantityOnHand = 0 },
            new() { ItemCode = "INJ-002", Name = "Normal Saline Solution 1L",        Unit = "Bottle",     CategoryId = catInject.Id, ReorderThreshold = 200, QuantityOnHand = 0 },
            new() { ItemCode = "INJ-003", Name = "D5W 500ml",                        Unit = "Bottle",     CategoryId = catInject.Id, ReorderThreshold = 150, QuantityOnHand = 0 },
            new() { ItemCode = "INJ-004", Name = "Cefuroxime 750mg Vial",            Unit = "Vial",       CategoryId = catInject.Id, ReorderThreshold = 50,  QuantityOnHand = 0 },
            new() { ItemCode = "SUP-001", Name = "Surgical Mask (Ear loop)",         Unit = "Box of 50",  CategoryId = catPPE.Id,    ReorderThreshold = 100, QuantityOnHand = 0 },
            new() { ItemCode = "SUP-002", Name = "Nitrile Examination Gloves M",     Unit = "Box of 100", CategoryId = catPPE.Id,    ReorderThreshold = 80,  QuantityOnHand = 0 },
            new() { ItemCode = "SUP-003", Name = "Face Shield",                      Unit = "Piece",      CategoryId = catPPE.Id,    ReorderThreshold = 30,  QuantityOnHand = 0 },
            new() { ItemCode = "LAB-001", Name = "Blood Glucose Test Strips",        Unit = "Vial of 50", CategoryId = catLab.Id,    ReorderThreshold = 20,  QuantityOnHand = 0 },
            new() { ItemCode = "LAB-002", Name = "CBC Reagent Pack",                 Unit = "Pack",       CategoryId = catLab.Id,    ReorderThreshold = 10,  QuantityOnHand = 0 },
            new() { ItemCode = "CLN-001", Name = "Hospital Grade Disinfectant 1 Gal",Unit = "Gallon",     CategoryId = catClean.Id,  ReorderThreshold = 15,  QuantityOnHand = 0 },
            new() { ItemCode = "CLN-002", Name = "Isopropyl Alcohol 70% 1L",         Unit = "Bottle",     CategoryId = catClean.Id,  ReorderThreshold = 30,  QuantityOnHand = 0 },
            new() { ItemCode = "SRG-001", Name = "Surgical Gauze 4x4 (10s)",         Unit = "Pack",       CategoryId = catSurg.Id,   ReorderThreshold = 100, QuantityOnHand = 0 },
            new() { ItemCode = "SRG-002", Name = "Sterile Syringe 10ml",             Unit = "Box of 50",  CategoryId = catSurg.Id,   ReorderThreshold = 50,  QuantityOnHand = 0 },
            new() { ItemCode = "SRG-003", Name = "IV Catheter 20G",                  Unit = "Box of 50",  CategoryId = catSurg.Id,   ReorderThreshold = 40,  QuantityOnHand = 0 },
        };

        await db.InventoryItems.AddRangeAsync(items);
        await db.SaveChangesAsync();

        // ────────────────────────────────────────────────────
        // 2. ITEM BATCHES + STOCK MOVEMENTS
        // ────────────────────────────────────────────────────
        var rng = new Random(42); // Fixed seed for reproducibility
        var now = DateTime.UtcNow;

        // Unit costs (parallel to items list)
        var unitCosts = new decimal[]
        {
            150m, 250m, 95m, 180m,     // oral meds
            45m, 85m, 80m, 320m,       // injectables
            120m, 350m, 60m,           // PPE
            850m, 1200m,               // lab
            550m, 180m,                // cleaning
            35m, 280m, 320m,           // surgical
        };

        for (int idx = 0; idx < items.Count; idx++)
        {
            var item     = items[idx];
            var unitCost = unitCosts[idx];
            var batchCount = rng.Next(2, 5);
            decimal totalQty = 0;

            for (int b = 0; b < batchCount; b++)
            {
                var batchQty   = rng.Next(30, 250);
                totalQty += batchQty;

                // Expiration spread: ~10% expired, ~15% expiring within 30 days, rest long-term
                var expRoll = rng.Next(100);
                var expDate = expRoll < 10 ? now.AddDays(-rng.Next(1, 60)) :
                              expRoll < 25 ? now.AddDays(rng.Next(5, 28)) :
                              now.AddMonths(rng.Next(4, 30));

                var batch = new ItemBatch
                {
                    InventoryItemId = item.Id,
                    LotNumber       = $"LOT-{now.Year}-{rng.Next(1000, 9999)}",
                    Quantity        = batchQty,
                    RemainingQuantity = batchQty,
                    ExpirationDate  = expDate,
                    ReceivedDate    = now.AddMonths(-rng.Next(0, 8)),
                    PurchaseOrderId = null,
                };
                await db.ItemBatches.AddAsync(batch);

                // Receipt movement for each batch – spread over last 6 months
                var receiptDate = now.AddMonths(-rng.Next(0, 6)).AddDays(-rng.Next(0, 28));
                await db.StockMovements.AddAsync(new StockMovement
                {
                    InventoryItemId       = item.Id,
                    MovementType          = StockMovementType.Receipt,
                    Quantity              = batchQty,
                    QuantityBeforeMovement = totalQty - batchQty,
                    QuantityAfterMovement  = totalQty,
                    MovementDate          = receiptDate,
                    Remarks               = $"Received batch {batch.LotNumber} from supplier",
                    PerformedByUserId     = invUser.Id,
                });
            }

            // Issuance movements – spread over last 6 months
            var issueCount = rng.Next(3, 9);
            decimal runningQty = totalQty;
            for (int i = 0; i < issueCount; i++)
            {
                var issueQty = rng.Next(1, Math.Max(2, (int)(totalQty * 0.05m)));
                if (runningQty - issueQty < 0) break;
                var issuedAt = now.AddDays(-rng.Next(1, 180));

                await db.StockMovements.AddAsync(new StockMovement
                {
                    InventoryItemId       = item.Id,
                    MovementType          = StockMovementType.Issuance,
                    Quantity              = issueQty,
                    QuantityBeforeMovement = runningQty,
                    QuantityAfterMovement  = runningQty - issueQty,
                    MovementDate          = issuedAt,
                    Remarks               = "Issued to department ward",
                    PerformedByUserId     = invUser.Id,
                });

                // Consumption records (Year / Month only)
                await db.ConsumptionRecords.AddAsync(new ConsumptionRecord
                {
                    InventoryItemId = item.Id,
                    QuantityConsumed = issueQty,
                    Year            = issuedAt.Year,
                    Month           = issuedAt.Month,
                    RecordedAt      = issuedAt,
                });

                runningQty -= issueQty;
            }

            item.QuantityOnHand = runningQty;
        }

        await db.SaveChangesAsync();

        // ────────────────────────────────────────────────────
        // 3. PROCUREMENT REQUESTS
        // ────────────────────────────────────────────────────
        var deptHeadDept = deptHead.DepartmentId ?? departments.First().Id;

        var pr1 = new ProcurementRequest
        {
            RequestNumber     = $"PR-{now:yyyyMMdd}-001",
            RequestedByUserId = deptHead.Id,
            DepartmentId      = deptHeadDept,
            RequestedAt       = now.AddDays(-5),
            Status            = ProcurementStatus.SubmittedByDepartment,
            Justification     = "Low stock on essential ward supplies. Urgent replenishment required.",
            Items             = new List<ProcurementRequestItem>
            {
                new() { InventoryItemId = items[0].Id, QuantityRequested = 50, EstimatedUnitCost = unitCosts[0] },
                new() { InventoryItemId = items[8].Id, QuantityRequested = 100, EstimatedUnitCost = unitCosts[8] },
            }
        };

        var pr2 = new ProcurementRequest
        {
            RequestNumber     = $"PR-{now:yyyyMMdd}-002",
            RequestedByUserId = deptHead.Id,
            DepartmentId      = deptHeadDept,
            RequestedAt       = now.AddDays(-12),
            Status            = ProcurementStatus.ApprovedByProcurement,
            Justification     = "Quarterly PPE replenishment per infection control protocol.",
            Items             = new List<ProcurementRequestItem>
            {
                new() { InventoryItemId = items[9].Id,  QuantityRequested = 200, EstimatedUnitCost = unitCosts[9] },
                new() { InventoryItemId = items[10].Id, QuantityRequested = 50,  EstimatedUnitCost = unitCosts[10] },
            }
        };

        var pr3 = new ProcurementRequest
        {
            RequestNumber     = $"PR-{now:yyyyMMdd}-003",
            RequestedByUserId = deptHead.Id,
            DepartmentId      = deptHeadDept,
            RequestedAt       = now.AddDays(-20),
            Status            = ProcurementStatus.FullyApproved,
            Justification     = "Injectable medications stock running low. Monthly requirement.",
            Items             = new List<ProcurementRequestItem>
            {
                new() { InventoryItemId = items[4].Id, QuantityRequested = 500, EstimatedUnitCost = unitCosts[4] },
                new() { InventoryItemId = items[5].Id, QuantityRequested = 300, EstimatedUnitCost = unitCosts[5] },
            }
        };

        var pr4 = new ProcurementRequest
        {
            RequestNumber     = $"PR-{now:yyyyMMdd}-004",
            RequestedByUserId = deptHead.Id,
            DepartmentId      = deptHeadDept,
            RequestedAt       = now.AddDays(-30),
            Status            = ProcurementStatus.PurchaseOrderGenerated,
            Justification     = "Replacement of surgical consumables.",
            Items             = new List<ProcurementRequestItem>
            {
                new() { InventoryItemId = items[15].Id, QuantityRequested = 200, EstimatedUnitCost = unitCosts[15] },
                new() { InventoryItemId = items[16].Id, QuantityRequested = 100, EstimatedUnitCost = unitCosts[16] },
            }
        };

        await db.ProcurementRequests.AddRangeAsync(pr1, pr2, pr3, pr4);
        await db.SaveChangesAsync();

        // ────────────────────────────────────────────────────
        // 4. STOCK ADJUSTMENTS
        // ────────────────────────────────────────────────────
        var adj1 = new StockAdjustment
        {
            InventoryItemId   = items[0].Id,
            RecordedQuantity  = items[0].QuantityOnHand,
            PhysicalCount     = items[0].QuantityOnHand - 2,
            Reason            = "Damaged packaging found during physical count",
            RequestedByUserId = invUser.Id,
            RequestedAt       = now.AddDays(-2),
            Status            = AdjustmentStatus.Pending,
        };

        var adj2 = new StockAdjustment
        {
            InventoryItemId   = items[8].Id,
            RecordedQuantity  = items[8].QuantityOnHand,
            PhysicalCount     = items[8].QuantityOnHand - 5,
            Reason            = "Stock discrepancy after ward transfer",
            RequestedByUserId = invUser.Id,
            RequestedAt       = now.AddDays(-7),
            Status            = AdjustmentStatus.Pending,
        };

        await db.StockAdjustments.AddRangeAsync(adj1, adj2);
        await db.SaveChangesAsync();
    }
}
