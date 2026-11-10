using Microsoft.EntityFrameworkCore;
using PPHIPMSystem.Server.Data;

namespace PPHIPMSystem.Server.Services;

// One place for keeping item batches in step with QuantityOnHand.
//
// The rule: an item's on-hand quantity is the source of truth, and the sum of
// its batches' RemainingQuantity must never exceed it (stock received before
// batch tracking may sit outside any batch, so it can be lower). Before this
// helper, department returns and stock adjustments changed on-hand without
// touching batches, so the Batches & Expiry page drifted away from the Items
// page and later FEFO issues drew from stock that no longer existed.
public static class BatchLedger
{
    // FEFO (First-Expire-First-Out): take stock from the batch expiring soonest.
    // A shortfall (pre-batch stock) is ignored rather than blocking the movement.
    public static async Task ConsumeFefoAsync(ApplicationDbContext db, int inventoryItemId, decimal quantity)
    {
        if (quantity <= 0) return;
        var batches = await db.ItemBatches
            .Where(b => b.InventoryItemId == inventoryItemId && b.RemainingQuantity > 0)
            .OrderBy(b => b.ExpirationDate == null)   // dated batches first
            .ThenBy(b => b.ExpirationDate)
            .ThenBy(b => b.ReceivedDate)
            .ToListAsync();

        var remaining = quantity;
        foreach (var batch in batches)
        {
            if (remaining <= 0) break;
            var take = Math.Min(batch.RemainingQuantity, remaining);
            batch.RemainingQuantity -= take;
            remaining -= take;
        }
    }

    // Reverse of ConsumeFefoAsync: put stock back onto the batches it most
    // likely came from, never past a batch's original received quantity. Any
    // surplus with no batch to hold it stays as unbatched on-hand stock.
    public static async Task RestoreFefoAsync(ApplicationDbContext db, int inventoryItemId, decimal quantity)
    {
        if (quantity <= 0) return;
        var batches = await db.ItemBatches
            .Where(b => b.InventoryItemId == inventoryItemId && b.RemainingQuantity < b.Quantity)
            .OrderBy(b => b.ExpirationDate == null)
            .ThenBy(b => b.ExpirationDate)
            .ThenBy(b => b.ReceivedDate)
            .ToListAsync();

        var remaining = quantity;
        foreach (var batch in batches)
        {
            if (remaining <= 0) break;
            var restore = Math.Min(batch.Quantity - batch.RemainingQuantity, remaining);
            batch.RemainingQuantity += restore;
            remaining -= restore;
        }
    }

    // Final safety net after any change: if the batches claim more than is on
    // hand, draw the excess off FEFO so the two can never disagree upward.
    public static async Task AlignToOnHandAsync(ApplicationDbContext db, int inventoryItemId, decimal quantityOnHand)
    {
        // Includes batch changes already made in this unit of work.
        var tracked = db.ChangeTracker.Entries<Models.ItemBatch>()
            .Where(e => e.Entity.InventoryItemId == inventoryItemId)
            .Select(e => e.Entity.Id)
            .ToHashSet();
        var trackedSum = db.ChangeTracker.Entries<Models.ItemBatch>()
            .Where(e => e.Entity.InventoryItemId == inventoryItemId && e.State != EntityState.Deleted)
            .Sum(e => e.Entity.RemainingQuantity);
        var untrackedSum = await db.ItemBatches
            .Where(b => b.InventoryItemId == inventoryItemId && !tracked.Contains(b.Id))
            .SumAsync(b => (decimal?)b.RemainingQuantity) ?? 0;

        var excess = trackedSum + untrackedSum - quantityOnHand;
        if (excess > 0)
            await ConsumeFefoAsync(db, inventoryItemId, excess);
    }
}
