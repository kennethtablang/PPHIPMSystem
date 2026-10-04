# PPH IPMS — User Tutorial

**Pangasinan Provincial Hospital — Inventory & Procurement Management System**

A complete, step-by-step guide to every function in the system. Work through it top to bottom the
first time; afterwards use it as a reference — each feature is its own section.

> **How to read this guide.** Features are grouped the same way the left sidebar is. A "🔒 Who can
> do this" line tells you which roles have access to each action. If you don't see a button described
> here, your role probably doesn't have permission for it.

---

## Table of Contents

1. [What the system does](#1-what-the-system-does)
2. [Roles at a glance](#2-roles-at-a-glance)
3. [Signing in](#3-signing-in)
4. [Getting around (sidebar, top bar, search, notifications)](#4-getting-around)
5. [Dashboard](#5-dashboard)
6. [Inventory — Items](#6-inventory--items)
7. [Inventory — Materials List](#7-inventory--materials-list)
8. [Inventory — Batches & Expiry](#8-inventory--batches--expiry)
9. [Inventory — Stock Movements](#9-inventory--stock-movements)
10. [Inventory — Stock Adjustments & Cycle Counts](#10-inventory--stock-adjustments--cycle-counts)
11. [Inventory — Department Stock](#11-inventory--department-stock)
12. [Procurement — Requests & the approval workflow](#12-procurement--requests--the-approval-workflow)
13. [Procurement — Department Requests](#13-procurement--department-requests)
14. [Procurement — Purchase Orders & Deliveries](#14-procurement--purchase-orders--deliveries)
15. [Procurement — Department Budgets](#15-procurement--department-budgets)
16. [Procurement — Purchase Requests (storeroom replenishment)](#16-procurement--purchase-requests-storeroom-replenishment)
17. [Analytics — Demand Forecasting](#17-analytics--demand-forecasting)
18. [Analytics — Reports](#18-analytics--reports)
19. [Notifications](#19-notifications)
20. [Administration — Users](#20-administration--users)
21. [Administration — Departments & Categories](#21-administration--departments--categories)
22. [Administration — Backups](#22-administration--backups)
23. [Administration — Audit Logs](#23-administration--audit-logs)
24. [Settings (your profile, security, preferences, appearance, system)](#24-settings)
25. [Key concepts explained](#25-key-concepts-explained)
26. [Keyboard shortcuts & tips](#26-keyboard-shortcuts--tips)

---

## 1. What the system does

PPH IPMS is a single platform that replaces spreadsheets for three jobs:

- **Inventory** — track every supply and pharmaceutical item, its stock level, its batches, and their
  expiration dates. Every increase or decrease in stock is recorded as a movement, and stock issued to
  wards is tracked per department.
- **Procurement** — two flows. **Wards** request supplies from the storeroom: Inventory checks stock
  and allocates it fairly, the Administrator approves, and the system releases the stock to the ward
  automatically. **The storeroom** restocks itself with **Purchase Requests**: the Chief of Hospital
  approves, Procurement raises the purchase order, and deliveries — including partial shipments — are
  received against it. The hospital's paper forms (RIS and Appendix 47 PR) print straight from the
  system.
- **Analytics** — forecast future demand from consumption history, and explore consumption, procurement,
  and forecast-accuracy data as charts before generating the report as Excel or PDF.

Everything is auditable: sensitive actions are written to an audit log, corrections are non-destructive
(voids leave the original on record), and the database is backed up automatically every day — both as a
readable Excel export and as a restorable SQL backup.

---

## 2. Roles at a glance

Your **role** decides which menus and buttons you see. There are six:

| Role | What they mainly do |
|------|--------------------|
| **Super Admin** | Full access to everything, including administration. |
| **Hospital Administrator** | Full operational access — inventory, procurement, reports, and administration. Gives **final approval** on ward requests and approves storeroom **Purchase Requests** as Chief of Hospital. Can stand in for the Inventory Officer at the stock-check step. |
| **Inventory Officer** | Manages items, batches, stock movements, adjustments; **checks stock and allocates** quantities on ward requests (including splitting short stock fairly between wards) and **releases** requests that were waiting on stock; runs forecasts. |
| **Procurement Staff** | The Supply Officer: drafts storeroom **Purchase Requests**, generates **purchase orders** from approved ones, and **receives deliveries**; sees reports and every department's budget. |
| **Department Head** | Raises supply requests for their department, tracks them, monitors *and records usage against* their department's held stock, transfers it to another ward, and sees their own department's budget. |
| **Department (Shared PC)** | A ward's shared account on its designated PC. Staff can see the ward's stock and file supply requests without waiting for the head — typing their own name on each request. Approvals and every other restricted function stay with named users. |

Throughout this guide, the "🔒 Who can do this" note names the roles allowed to perform each action.

---

## 3. Signing in

### Logging in
1. Open the app. You land on the **Sign In** screen.
2. Enter your **Username** (e.g. `admin.santos`) and **Password**.
3. Use the 👁 eye icon in the password box to reveal what you typed.
4. Click **Sign In**.

If your username/password is wrong — or your account has been deactivated — you'll see an error.

### Account lockout
After **5 failed attempts** the account is locked for **15 minutes**. The login screen tells you when
this happens. Wait it out and try again, or ask an administrator. Wrong 2FA codes count toward the same
lockout, so codes can't be guessed by brute force either.

### Two-factor authentication (2FA)
If you have 2FA turned on (see [Settings → Security](#24-settings)), after your password the system asks
for a **6-digit verification code**. Where the code comes from depends on your setup:

- **Authenticator app** (recommended) — if you've enrolled Google/Microsoft Authenticator, open the app
  and type the code it shows. This works even when email is down. The screen will say
  *"Enter the 6-digit code from your authenticator app."*
- **Email** — otherwise the code is emailed to your registered address. Codes expire after a short
  time — if it doesn't work, sign in again to get a fresh one.

### First login after your account is created or reset
Accounts that start with a password someone else assigned (a new account, or after an administrator
resets your password) are forced to set their own password before entering the app. You'll land on a
**Set Your Own Password** screen — enter the assigned password as "current", then choose a new one that
meets the policy. Until you do, the rest of the app is unreachable.

### Forgot your password
1. On the login screen, click **Forgot your password?**
2. Enter your email; the system sends a reset link.
3. Open the link and set a new password (the same password policy applies, with live hints).

### Staying signed in
While you keep using the system, your session renews itself quietly — you won't be logged out mid-shift
just because time passed. Sessions end when you **Sign Out**, when your configured **idle timeout**
triggers (Settings → Preferences), or when your password is changed — a password change signs out all
your sessions everywhere, on purpose.

---

## 4. Getting around

### The sidebar (left)
Groups your menus: **Main**, **Inventory**, **Procurement**, **Analytics**, and **Administration**.
You only see the groups your role can use. Collapse/expand it with the arrow button at the top — or set
it to start collapsed under [Settings → Appearance](#24-settings).

### The top bar
- **Page title** — the name of where you are.
- **🔍 Global search** — see below.
- **🔄 Refresh** — reloads the current page.
- **🔔 Notifications bell** — a red badge shows your unread count; click to open the Notifications page.
- **Your name chip** — click it for **Profile Settings** and **Sign Out** (sign-out asks you to confirm).

### Global search (Ctrl + K)
1. Press **Ctrl + K** (or **⌘ + K** on Mac) anywhere to jump into the search box.
2. Type at least 2 characters. It searches **inventory items (by name, brand, or code), procurement
   requests, purchase orders, and (for administrators) users**.
3. Use **↑ / ↓** arrow keys to move through results and **Enter** to open the highlighted one, or click
   any result. **Esc** closes it.
4. Picking an item or user takes you to that page with its search box already filled in.

### Notification pop-ups & sound
New notifications arrive live (no refresh needed). Whether they show as pop-up "toasts" and whether they
chime is up to you — toggle both under [Settings → Preferences](#24-settings). The bell badge always
updates regardless.

### Announcement banner
Administrators can post a hospital-wide message (e.g. "maintenance this Sunday"). It shows as a banner
at the top until you dismiss it, until its scheduled end time passes, or before its scheduled start.
A changed announcement reappears even if you dismissed the previous one.

---

## 5. Dashboard

The **Dashboard** is your home screen and updates in real time — when anyone records a stock change
anywhere in the hospital, your numbers refresh without a reload.

**Stat cards (click any to jump there):**
- **Total Items**, **Low Stock Alerts**, **Expiring Batches**, **Pending Requests**,
  **Pending Adjustments**, **Unread Notifications**.

**Charts:**
- **Procurement vs Consumption (6 months)** — value received vs value issued.
- **Stock Value by Category** — where your stock value sits.

**Live lists:**
- **Low Stock Alerts** — items below their reorder point. If your role can raise requests, each row has a
  **Create PR** button that starts a procurement request pre-filled for that item.
- **Expiring Soon** — batches nearing expiry.
- **Recent Transactions** — the latest movements. **Receipt** and **Issuance** rows have a **Repeat**
  button to quickly record the same movement again (handy for routine daily issues).

> **Department Heads** see a department-scoped dashboard focused on their own requests.

---

## 6. Inventory — Items

The master list of everything you stock. **Sidebar → Inventory → Items.**

### Finding items
- **Search** by name, brand, or code.
- Filter by **Category**.
- Tick **Low Stock Only** to see just the items at or below their reorder threshold.

### Reading a row
**Item Code**, **Description / Generic Name** (with any additional details underneath), **Brand**,
category, unit, **Supplies Available** (turns red with a ⚠ when below reorder), reorder point, forecast
method, and status (**Available / Not Available / Inactive**).

### Selecting items with the tick boxes
🔒 *Super Admin, Hospital Administrator, Inventory Officer, Department Head*

Every row has a tick box on the left, and the header has a **select-all** box.

- Tick individual rows, or use the header box to select **every item currently listed** (that means
  everything matching your search and filters — not just the page you're looking at).
- The header box shows a **dash** when only some rows are ticked, and a check when all are.
- Ticked rows are highlighted green. The count stays correct as you page through the list.
- Changing a filter or search drops any ticks for rows that are no longer listed, so the count can
  never include something you can't see.

As soon as anything is ticked, a green **action bar** appears above the table with the bulk actions
below. **Clear** on the right unticks everything.

### Adding an item
🔒 *Hospital Administrator, Inventory Officer*
1. Click **Add Item**.
2. Fill in **Description / Generic Name**, **Category**, and **Unit of Measure** (required), plus
   optional **Brand**, **Item Code** and **Additional Details**.

   > **What counts as the same item.** An item is identified by its **Category + Description/Generic
   > Name + Brand + Unit**. Capitalization, punctuation, spacing and unit spelling are ignored, so
   > *3CC SYRINGE* / box and *3cc, Syringe* / BOXES are the same item, and saving the second one is
   > refused with a message naming the existing record. **Item Codes** must also be unique.
   >
   > **Same item, different brands.** The hospital stocks many generics under more than one make
   > (e.g. *50CC SYRINGE* from Terumo and from Indoplas). Enter each make as its own item with a
   > different **Brand** — that's allowed, because the brand makes them different items.

   As you type, the form checks the list for you:
   - A **red** box means the item already exists — use the existing record instead.
   - An **amber** box lists *similar* items (same words and unit, e.g. one has no brand, or the wording
     differs slightly). Saving is still allowed — just make sure you aren't creating a duplicate.
3. Set the **Reorder Threshold** (the low-stock trigger) and **Expiration Warning (days)**. New items
   are pre-filled with the hospital-wide defaults from Settings → System — override them freely.
4. Choose the **Forecast Method**:
   - **Moving Average** — set the **MA window** (number of past months to average).
   - **Exponential Smoothing** — set the **smoothing constant α** (0.01–0.99).
5. Click **Create Item**.

### Editing an item
🔒 *Hospital Administrator, Inventory Officer* — click the ✏️ pencil, change fields, **Save Changes**.
You can also flip an item between **Active** and **Inactive** here. The same duplicate checks as
*Adding an item* apply when you change the description, brand, unit or category; items that were
already duplicates can still be edited until someone merges them.

> If someone else saved the same item while you were editing, your save is refused with a
> *"changed by someone else"* message — reload the list and re-apply your change. This is deliberate:
> nobody's edit gets silently overwritten.

### Deleting an item
🔒 *Super Admin, Hospital Administrator* — click the 🗑 trash icon and confirm. Deleting doesn't erase the
item: it is **deactivated** and disappears from the item list, while its batches, movements and request
history are kept for reports and the audit trail. If the item is a duplicate of another, **merge** it
instead (see *Finding and merging duplicate items*), so its stock and history move to the remaining record.

### Finding and merging duplicate items
🔒 *Hospital Administrator, Inventory Officer* (merging: *Hospital Administrator* only)

Over time the same item can end up in the list more than once — typed differently, imported twice, or
filed under the wrong category. Duplicates split stock and request history across two records, so
clean them up:

1. Click **Duplicates** on the Items page. The system groups items that look like the same item:
   - **Exact** — same category, description, brand and unit once spelling is ignored. This is the same
     item recorded twice.
   - **Similar** — same words and unit, but a detail differs: one copy has no brand, the wording or
     word order differs, the category differs, or a stray number was left at the end by the old system
     (*Adrenalin 1mg/ml* vs *Adrenalin 1mg/ml 2*). Each group says what differs. **Check these
     carefully** — some are genuinely different items (e.g. suture sizes *Vicryl 2-0 plus 3* vs *plus 4*).

   Items with **different brands are never grouped**, and a trailing number that is clearly a size
   (*GLOVES 7*, *Size 6*) is not treated as a stray counter.
2. Use the **All / Exact / Similar** buttons to filter the groups.
3. In a group, tick the **Keep** radio on the record to keep — usually the one with the correct code,
   category and brand. It defaults to the oldest record.
4. Click **Merge into Kept** and confirm. For the other records in the group:
   - their **stock on hand, batches, department stock, monthly consumption, adjustments, requests and
     purchase orders** move to the kept item (amounts for the same department or month are added
     together);
   - if the kept item has no brand, code or details, it takes them from a merged record;
   - the merged records are **deactivated** and their item codes released. Their old forecasts are
     dropped — the kept item's forecast is regenerated from the combined history.

> **Merging cannot be undone**, which is why only an administrator can do it. Items counted in
> different units (e.g. *box* vs *pc*) can't be merged, because their quantities can't simply be added.
> Every merge is recorded in the **Audit Log** with the codes, names and quantities of the merged records.

If a **Similar** group is really two different items, edit one of them so they differ more clearly
(e.g. add the missing brand, or correct the unit or category) and it will drop off the list.

### Bulk import from Excel
🔒 *Hospital Administrator, Inventory Officer*

The fastest way to load a large catalogue (e.g. migrating from a spreadsheet):
1. Click **Import**.
2. **Download the template** link gives you the correct columns: *Name, Brand, Item Code, Description,
   Unit, Category, Reorder Threshold, Expiration Warning Days*. Column order doesn't matter. A column
   headed *Description/Generic Name* (as in the hospital's catalog export) is accepted as the name.
3. Choose your `.xlsx` file and click **Preview**.
4. The preview table marks each row **Ready** or **Error** with the exact reason — an item with the same
   category, description, brand and unit, or a duplicate code (within the file *or* against existing
   items), missing required fields, or values out of range. Fix errors in the file if you want those
   rows included.

   **Ready** rows may also carry an amber note — these don't block the import:
   - *Unit "PCS" recorded as "pc"* — unit spellings are standardized so stock and forms group
     consistently (pcs/PCS → **pc**, bxs/boxes → **box**, bot/bots → **bottle**, tabs → **tablet**, and
     so on). Units the system doesn't recognize are kept as typed.
   - *New category "Medical Supplies" will be created* — categories that don't exist yet are created
     on import instead of rejecting the row. Check the spelling here: a typo would create a stray
     category.
   - *Possible duplicate of existing item … — check before importing* — the row has the same words and
     unit as an existing item (or an earlier row) with a compatible brand, but isn't an exact match.
     Remove the row if it's the same item; otherwise it's fine to import.
5. Click **Import N Valid Item(s)**. Invalid rows are skipped and reported; the confirmation lists any
   categories that were created.

Blank *Expiration Warning Days* cells inherit the system default. Up to 1,000 rows per file.

> **Loading the hospital catalog.** Use *Medical Catalog - Import Ready.xlsx* (in the revisions
> folder), not the raw *Medical Catalog.xlsx*. The import-ready copy has duplicates removed, units
> fixed, drugs and supplies sorted into **Drugs and Medicines / Medical Supplies / Laboratory
> Supplies**, and the old system's number suffixes stripped (*Cefotaxime 1g 999* → *Cefotaxime 1g*).
> Its **Review** sheet lists every change against the original row — read the rows marked
> *"please check"* before importing, since some trailing numbers are real sizes (*GLOVES 7*).

### Export a snapshot
🔒 *Super Admin, Hospital Administrator, Procurement Staff, Inventory Officer* — **Export Snapshot**
downloads the current inventory as an Excel workbook with four sheets:
- **Stock on Hand** — every active item with quantity, reorder point, and a LOW STOCK flag.
- **Batches & Expiry** — active batches sorted soonest-expiry-first, with unit cost and line value.
- **Valuation** — per-item weighted-average cost and stock value (over batches that have a recorded
  cost), with a grand total. Uncosted stock is explicitly noted as excluded, so totals never mislead.
- **Department Stock** — what each ward is holding, plus a per-department roll-up of distinct items and
  total units. This stock has already been deducted from *Stock on Hand*, so the two sheets don't
  overlap — add them together for everything the hospital owns.

### Printing QR labels
🔒 *Hospital Administrator, Inventory Officer*
1. Filter the list to the items you want labels for (or leave it unfiltered for all). To label just a
   handful, tick those rows and use **Labels** in the green action bar instead.
2. Click **Labels** — a preview shows one label per item: a **QR code of the item code**, the name,
   code, and unit.
3. Click **Print N Label(s)** (allow pop-ups). Print on plain paper or 3-column label sheets and cut
   along the dashed guides.

Scanning a label with a handheld scanner types the item code into whichever search picker is focused —
press **Enter** and the item is selected. Great for fast issuing and receiving.

### Replenishing stock (recording quantity and expiry)
🔒 *Hospital Administrator, Inventory Officer*

Restock without leaving the Items page. Each line you fill in is recorded as a **batch**, which is what
makes the new stock visible to expiry alerts, FEFO issuance, and valuation.

**One item:** click **Replenish** on its row.
**Several at once:** tick the rows, then click **Replenish Selected** in the green action bar.

Either way the same form opens, with one line per item showing its current stock on hand:

| Field | Notes |
|---|---|
| **Lot / Batch No.** | Optional, but strongly recommended — it's what a batch QR label encodes. |
| **Qty Received** | Leave **blank to skip** that item. Only filled lines are submitted. |
| **Expiration Date** | Optional for non-perishables. **Enter it for anything that expires** — this is the field that drives expiry warnings and FEFO. |
| **Unit Cost (₱)** | Optional; feeds the valuation report. |

Click **Receive N Item(s)**. Stock on hand goes up immediately and the dashboard refreshes live.

> **All or nothing.** The whole receipt is applied in a single step. If any line is rejected, *nothing*
> is saved — the form stays open with your entries intact so you can fix the problem and submit again
> without any risk of double-counting the lines that were already fine.

If a line's expiration date already falls inside that item's warning window, an expiration
notification is raised for Inventory Officers straight away.

> Receiving against a purchase order is a different flow — use
> [Confirm Delivery](#14-procurement--purchase-orders--deliveries), which carries the PO's unit cost
> over automatically. Use **Replenish** for donations, direct purchases, and stock found during a count.

### Request replenishment from here
🔒 *Super Admin, Hospital Administrator, Department Head*
- On a single low-stock row, click **Reorder** to open a procurement request pre-filled for that item
  with a suggested quantity.
- **Tick any rows** and click **Reorder Selected** in the green action bar to raise **one** request
  covering all of them. This works on any items, not just low-stock ones.
- With **Low Stock Only** on and nothing ticked, **Request Replenishment (N)** raises one request
  covering every low-stock item shown.

In all three cases each line is pre-filled with a suggested quantity (roughly enough to reach twice the
reorder point) — edit freely before submitting.

> **Reorder vs Replenish.** *Reorder* raises a **request to buy** stock you don't have yet.
> *Replenish* records stock that has **physically arrived**. Use Reorder to start the procurement
> workflow; use Replenish when the boxes are on the shelf.

---

## 7. Inventory — Materials List

**Sidebar → Inventory → Materials List.** A focused, at-a-glance view of stock for quick reference and
lookups. Use it when you just need to check availability without the full management controls of the
Items page.

---

## 8. Inventory — Batches & Expiry

Tracks stock in **batches** (lots), each with its own quantity, expiration date, and acquisition cost.
This is what powers expiry warnings, **FEFO** issuance, and valuation (see
[Key concepts](#25-key-concepts-explained)). **Sidebar → Inventory → Batches & Expiry.**

### Viewing batches
- **Expiring Soon** vs **All Batches** toggle.
- In "Expiring Soon", pick a window: **30 / 60 / 90 / 180 days**.
- Each row shows lot number, quantity, remaining, expiration date, days-until-expiry (red when close or
  overdue), and a status badge (**Expired / Critical / Expiring Soon**).

### Receiving a batch manually
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **Receive Batch**.
2. Pick the **item**, enter **Lot / Batch Number** (optional), **Quantity Received**, **Expiration Date**
   (optional), and **Unit Cost** (optional — feeds the valuation report).
3. Click **Receive Batch** — stock on hand goes up automatically.

> Deliveries against a purchase order create batches for you, with the unit cost carried over from the
> PO automatically (see [Purchase Orders](#14-procurement--purchase-orders--deliveries)). Use manual
> receiving for donations or direct purchases.

> **Receiving several items at once?** Use **Replenish** on the
> [Items page](#6-inventory--items) instead — same fields, one line per item, applied in a single
> all-or-nothing step. **Receive Batch** here is the quickest route for a single lot.

### Correcting a batch (typo fix)
🔒 *Super Admin, Hospital Administrator, Inventory Officer* — click the ✏️ pencil to fix a wrong **lot
number** or **expiration date** entered at receiving. The change is audit-logged with old → new values.
(Fixing a wrong expiry matters — it keeps FEFO ordering and expiry warnings correct.)

### Disposing a single batch
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **Dispose** on a batch that still has remaining stock.
2. Pick a reason (Expired, Damaged/contaminated, Quality failure, Recall, or **Other** with your own
   text).
3. **Confirm Disposal** — remaining quantity goes to zero, stock on hand is reduced, and a **Disposal**
   movement plus an audit entry are recorded. This can't be undone.

### Disposing all expired batches at once
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **Dispose All Expired**.
2. Enter a disposal reason (it applies to the whole sweep).
3. **Dispose All Expired** — every batch past its expiry with remaining stock is written off in one go.
   Each batch still gets its own Disposal movement, so the paper trail stays per-lot.

Typical rhythm: run this monthly, then download the certificate (below) for filing.

### Disposal certificate (for COA audits)
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **Disposal Certificate**.
2. Choose a **From / To** date range (defaults to the current month).
3. **Download Excel** — a signed-copy certificate listing every disposal in the period (timestamp, item,
   quantity, batch details, who performed it) with totals and a *Prepared / Noted / Witnessed by*
   signature block for filing.

### Printing batch labels
🔒 *Super Admin, Hospital Administrator, Inventory Officer* — click **Labels** to print QR labels for
the batches currently shown. Each label encodes the **lot number** and prints the item name and expiry
date — stick them on the physical stock so lots stay identifiable on the shelf.

---

## 9. Inventory — Stock Movements

The ledger of every stock increase and decrease. **Sidebar → Inventory → Stock Movements.**

### Movement types
- **Receipt** (+) and **Return** (+) increase stock.
- **Issuance** (−) and **Disposal** (−) decrease stock. Outbound movements consume batches **FEFO**
  (first to expire, first out).
- **Ward Usage** leaves central stock **unchanged** — it only draws down a department's balance. You
  can filter for it and void it here, but you record it on the
  [Department Stock](#11-inventory--department-stock) page, against a specific ward.
- **Ward Transfer** also leaves central stock **unchanged** — it moves units from one department's
  balance to another's. Recorded on the [Department Stock](#11-inventory--department-stock) page;
  filterable and voidable here.
- **Adjustments** never come through here — they have their own approval flow
  (see [Stock Adjustments](#10-inventory--stock-adjustments--cycle-counts)).

### Reading the page
The stat cards at the top (total movements, units received, units issued, disposal count) cover the
**whole filtered history**, not just the rows on screen. Filter by item (searchable picker) and by type;
the table pages through results using your rows-per-page preference.

Each row shows the type badge, item, signed quantity, before/after quantities, remarks, who performed
it, and the date. Department-linked movements show **→ Department** (issued to) or **← Department**
(returned from) under the type badge; a ward transfer shows **Ward A → Ward B**. Movements that
leave central stock untouched (ward usage, ward transfers) show their quantity **unsigned and in
grey**, so it can't be misread as stock arriving or leaving the storeroom. Voided movements appear
dimmed with a **Voided** badge; their compensating entries carry a **Reversal** badge.

### Recording a movement
🔒 *Hospital Administrator, Inventory Officer*
1. Click **Record Movement**.
2. Pick the **item** — a live card shows current stock, reorder point, and the projected level after the
   movement (it warns if you'd go below zero).
3. Choose **Movement Type** and enter **Quantity** (and optional **Remarks**).
4. For an **Issuance**, you can pick the **department** the stock is going to; for a **Return**, the
   department it's coming back from. This keeps the department's held balance accurate (see
   [Department Stock](#11-inventory--department-stock)). Leave it blank for external/unattributed
   movements.
5. Click **Record**. Issuances also update that item's monthly consumption (used by forecasting), and a
   low-stock alert fires if the item drops below its reorder point.

### Voiding (reversing) a movement
🔒 *Hospital Administrator, Inventory Officer*

Use this when a movement was entered by mistake. Voiding **doesn't delete** anything — the original stays
on record (flagged as voided, with who/when/why) and the system posts a **compensating reversal** that
undoes its effect.

1. Click **Void** on the movement's row.
2. Enter a **reason** (required).
3. **Void Movement**. Stock is corrected on every ledger the movement touched:
   - outbound voids add central stock back **and restore batch quantities**;
   - inbound voids remove the stock again (blocked if it has since been drawn below the amount);
   - voiding an issuance also **rolls back its consumption record**, keeping forecasts honest;
   - department-linked movements have their **department balance reversed** too.

> Movements linked to a purchase order can't be voided here — correct those through the delivery flow.
> Reversal entries themselves can't be voided.

---

## 10. Inventory — Stock Adjustments & Cycle Counts

Reconciles the system's numbers with what's physically on the shelf. Every adjustment needs approval
before stock changes. **Sidebar → Inventory → Adjustments.**

### Filtering
Filter by status: **All / Pending / Approved / Rejected**.

### Single adjustment
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **New Adjustment**.
2. Pick the **item** — you'll see the recorded quantity and a live **variance** as you type.
3. Enter the **Physical Count** and a **Reason**.
4. **Submit for Approval**. Nothing changes yet — a supervisor must approve it.

### Cycle count worksheet (many items at once)
🔒 *Super Admin, Hospital Administrator, Inventory Officer*

For count days, when staff physically check dozens or hundreds of items:
1. Click **Cycle Count**.
2. Enter a **count reason** that applies to the whole session.
3. Use the filter box to find items; type the **counted quantity** next to each item you physically
   checked — leave the rest blank. Each row shows the variance live (+green / −red / **Match**).
4. The footer tallies "counted" and "with variance". Click **Submit N Adjustment(s)** — every item whose
   count differs from the record becomes a pending adjustment; matches are noted but create nothing.
   Approvers get **one** notification for the whole count, not one per line.

### Reviewing / approving an adjustment
🔒 *Super Admin, Hospital Administrator*
1. On a **Pending** row, click **Review**.
2. See the recorded vs physical counts and the variance.
3. Choose **Approve** (stock is updated to the physical count and an Adjustment movement is recorded) or
   **Reject** (a remark is required), then confirm. The requester is notified either way.

---

## 11. Inventory — Department Stock

Tracks what each ward/unit is currently holding — everything issued **to** a department that hasn't been
returned. **Sidebar → Inventory → Department Stock.**

### How balances change
- Recording an **Issuance** with a destination department **adds** to that department's balance.
- Recording a **Return** from a department **subtracts** from it. You can't return more than the
  department has recorded — the error message tells you exactly how much it holds.
- Recording **ward usage** subtracts from it too (see below).
- A **ward transfer** subtracts from the sending department and adds to the receiving one.
- **Voiding** a department-linked movement reverses the department's balance too.

### Viewing
- **Department Heads** automatically see only their own department's holdings — no department picker.
- Everyone else can pick a department or browse **all departments** at once (the table gains a
  Department column).
- Search by item name or code; each row shows the quantity held and when it last moved.

> Balances start from zero — history from before this feature isn't back-filled. From the first
> department-tagged issuance onward, the ledger stays accurate.

### Recording ward usage
🔒 *Super Admin, Hospital Administrator, Inventory Officer, Department Head*

When a ward actually **uses up** stock it was issued, record it here so its balance reflects what's
really on the ward's shelf.

1. Find the row and click **Record Usage**.
2. The panel confirms how much that department currently holds.
3. Enter the **Quantity Used** and optional **Remarks** (e.g. *"Used during the morning shift"*).
4. Click **Record Usage**.

The balance drops immediately, and a **Ward Usage** entry is written to the movement ledger tagged
`⊗ used at <department>`. Rows that reach zero drop off the page.

> **This does not change central stock on hand — and that is deliberate.** The item left the storeroom
> when it was *issued*; that's the moment central stock fell and the moment the system counted the item
> for demand forecasting. Recording usage here only closes the loop on the ward's own balance. If it
> also touched central stock, you'd be subtracting the same units twice and your forecasts would come
> out roughly double.

**Who records what.** Department Heads can record usage for **their own department only** — the server
enforces this, so it doesn't matter what a modified request claims. Inventory Officers and
Administrators can record for any department.

**Made a mistake?** Ward Usage entries are corrected by **voiding** them, which an *Inventory Officer or
Administrator* does from the [Stock Movements](#9-inventory--stock-movements) page (filter by **Ward
Usage** to find it). The units go back into the ward's balance and central stock is left alone.
Department Heads don't have access to that page — ask your inventory officer to void the entry.

### Transferring stock to another department
🔒 *Super Admin, Hospital Administrator, Inventory Officer, Department Head*

When one ward hands stock straight over to another — without sending it back to the storeroom first
— record it as a transfer.

1. Find the row and click **Transfer**.
2. Pick the **Receiving Department** (searchable; the sending department isn't offered).
3. Enter the **Quantity to Transfer** and optional **Remarks** (e.g. *"Lent to cover a shortage on
   the night shift"*).
4. Click **Transfer Stock**.

The sending ward's balance drops, the receiving ward's rises by the same amount, and one **Ward
Transfer** entry appears in the ledger tagged `Ward A → Ward B`. You can't send more than the ward
holds — the error names the exact balance.

> **Central stock on hand doesn't change, and neither do the batches or the forecasting figures.**
> The units left the storeroom when they were first issued and they never came back through it;
> hospital-wide totals are identical before and after. A transfer only moves stock between two
> pockets of the same trousers.

**Who transfers what.** A Department Head can only transfer **out of their own department** — the
server enforces this from their account, whatever a modified request claims. They may still *receive*
from anywhere. Inventory Officers and Administrators can transfer between any two departments.

**Made a mistake?** Void the Ward Transfer entry from the [Stock Movements](#9-inventory--stock-movements)
page and the units walk back to the sending ward. If the receiving ward has already used the stock,
the void is refused rather than driving its balance negative — record the usage properly instead.

---

## 12. Procurement — Requests & the approval workflow

Where supply requests are raised and routed for approval. **Sidebar → Procurement → Requests.**

The page has two tabs, one per flow:
- **Department Requests** — wards asking the storeroom for supplies (this section).
- **Purchase Requests** — the storeroom asking the Provincial Government to buy stock. See
  [Purchase Requests](#16-procurement--purchase-requests-storeroom-replenishment).

### The approval workflow
A ward's request moves through four steps, shown as a progress bar in the request's **View** window:

1. **Draft** (`Draft / Dept. Request`) — created but not yet sent. Submit it when ready.
2. **Inventory Review** — the Inventory Officer checks central stock and **allocates** how much of each
   line the ward gets. When several wards want the same item and there isn't enough, the stock is
   split between them (see [Stock allocation](#stock-allocation-when-wards-compete)).
3. **Admin Approval** — the Hospital Administrator gives final approval.
4. **Released** — on final approval the system **issues the allocated quantities straight into the
   ward's department stock**. Nobody re-enters anything: central stock goes down, department stock goes
   up, batches are drawn first-expiry-first, and consumption is recorded — exactly as if the storeroom
   had issued it by hand.

At either review step the reviewer can **Approve**, **Reject**, or **Return for revision** (sends it back
to the requester to fix and resubmit; remarks are required for reject and return).

> **Awaiting Stock.** If central stock has run short by the time of final approval, the request is
> approved but not released — its badge reads **Awaiting Stock**. Procurement and Inventory are
> notified. Once the stock arrives (usually via a [Purchase Request](#16-procurement--purchase-requests-storeroom-replenishment)),
> the Inventory Officer clicks **Release**. A request is released whole or not at all, so a ward never
> silently receives half an order.

### Aging indicator
Requests waiting more than **7 days** without action are flagged ("waiting Nd" — amber at 7 days, red at
14), and a banner above the table summarizes how many are stalled — so nothing silently sits.

### Creating a request
🔒 *Super Admin, Hospital Administrator, Department Head* — and *Department (Shared PC)* accounts from
[Dept. Requests](#13-procurement--department-requests).
1. Click **New Request**. The form is laid out like the paper **Requisition and Issue Slip**.
2. Choose the **Requesting Department** (administrators only — everyone else is fixed to their own) and
   check **Requested By**. On a shared PC this is required: type the name of the person who needs the
   supplies.
3. Enter the **Purpose**.
4. Add items from the catalogue on the left: search by name, brand, or code, or narrow it by category
   chip (the **Low stock** chip shows items at or below reorder). Click an item to add it; enter **Qty**
   and optional **Remarks** for each line.
5. **Save Draft** to finish later, or **Save & Submit** to send it for inventory review.

> Coming from a Dashboard/Inventory "reorder" button pre-fills the form for you — including suggested
> quantities on bulk replenishment.

### Attaching supporting documents
Open a request with **View** — the **Attachments** panel sits below the item list.
- **Attach File** uploads quotations, canvass sheets, or other supporting documents (PDF, images, Word,
  Excel; up to 10 MB each; up to 10 files per request).
- Anyone who can see the request can **download** its attachments — so approvers see the canvass
  documentation right next to the approval history.
- You can **delete your own** uploads; administrators can delete any. Uploads and deletions are
  audit-logged.
- Department Heads can only reach attachments on their own department's requests.

### Official forms (RIS / PR)
In the request's **View** window, the footer offers the hospital's paper forms as Excel files, laid out
to print like the originals. Open the file and print — each page is a complete form that can be signed
on its own.

**RIS — Requisition and Issue Slip** *(FRM-ADM-SUP-011; department requests only)*

What a ward uses to draw supplies from the storeroom.
- **Letterhead:** hospital name with the province and hospital seals, address, and ISO / CIP line.
- **Header:** Department / Office, Date, and RIS No. (the request number).
- **Table:** 25 lines per page — **Qty**, **Unit**, and **Articles/Description** on the *Requisition*
  side; **Quantity** and **Remarks** on the *Issuance* side. Descriptions include the brand, since the
  slip records exactly which stock went out.
- **Before release**, the Issuance Quantity column and *Issued by* are left blank for the storeroom's
  pen. **After the system releases the request**, the quantities actually issued and the Inventory
  Officer's name are printed in. A line that got less than asked shows *"Allocated N (limited stock)"*.
- **Signatures:** *Requested by* (End User — the name typed on the request), *Noted by* (Section Head —
  the department head on record), *Approved by* (OIC - Chief of Ancillary Service and Chief Nurse),
  *Issued by*, and *Received by*.
- **Footer strip:** form code, revision number, revision date, and **Page X of Y**.
- Printed on Letter (short bond). Longer requests continue on the next page with the full form repeated.

**PR Form — Purchase Request** *(Appendix 47)*

What Procurement sends to the Provincial Government to buy stock.
- **Header:** LGU, Fund, Department (*PPH*), Section, FPP, PR No. and Date.
  - **PR No.** and **Date** are left blank on purpose — the provincial office assigns them. The
    system's own request number and date print in small type under the form, where the office writes
    its control number.
  - **Fund, Section and FPP** come from the request if you filled them in (see below); otherwise they
    print as blank lines.
- **Table:** 30 lines per page — **Item No.** (continuing across pages), **Unit** (PCS, BOT, GAL…),
  **Item Description** in capitals, **Quantity**, **Unit Cost** and **Total Cost**. Costs appear only
  where an estimated cost was entered; a **TOTAL** row closes the last page.
- **No brands** on a PR — government procurement specifies the item, never the make.
- **Purpose** (the request's justification) and the three signatory boxes: *Requested by* (Chief of
  Hospital), *Cash Availability* (Provincial Treasurer), and *For & By Authority of the Governor*
  (PHMSO Head).
- Set to 8.5 × 13 long bond; if your printer doesn't offer that size, each form still fits on one
  Letter page.

> **One PR per category per semester.** The supply office raises separate PRs for medical, office,
> and janitorial supplies, each for a half-year (e.g. *"Medical supplies for use of Pangasinan
> Provincial Hospital July – December CY 2026"*). Build each one as its own Purchase Request so each
> prints as its own form.

**Filling in Fund, Section and FPP.** On a new or edited **Purchase Request** (replenishment), three
optional fields appear under the header: **Fund**, **Section**, and **FPP**. These are usually
assigned later by the provincial budget and treasury offices — leave them blank and write them on the
printout, or type them in once known and re-export the form.

> **Before your first print:** an administrator should fill in the signatory names, approvers, and
> form revision under [Settings → System](#system-administrators-only), and put the seal images on the
> server (see the same section). Until then, names print as blank signing lines and the letterhead
> prints without seals.

### Submitting a draft
🔒 *Super Admin, Hospital Administrator, Department Head, Department (Shared PC)* — on a **Draft** or
**Returned** request, click **Submit** to send it for inventory review. Until Inventory approves it, the
requester can still **Edit** or **Cancel** the request from [Dept. Requests](#13-procurement--department-requests)
(a cancel reason is optional); after that it is locked.

### Reviewing a request — stock check & allocation
🔒 *Inventory Officer* (or an administrator standing in)

1. Click **Review & Allocate** on a request in **Inventory Review**.
2. The **Stock Check & Allocation** table shows, for each line: what was **Requested**, what is
   **Available** (on hand minus stock already promised to approved requests), how much **other wards**
   are asking for, the line's **Fair Share**, an **Allocate** box, and the **Remaining Stock** after
   your allocation (red with *"must be procured"* if it goes negative).
3. Use **Fair Share** to fill every line with its proportional cut, **Full Request** to give everything
   asked for, or type quantities yourself. Lines given less than requested are highlighted.
4. **Approve** (or Reject / Return with remarks). The requester is notified — including a note when
   quantities were cut to the stock available — and the request moves to **Admin Approval**.

### Stock allocation when wards compete
🔒 *Inventory Officer, Hospital Administrator*

When wards together ask for more than the storeroom has (e.g. 30 + 20 + 40 gloves against 80 on the
shelf), don't let the first request drain it. Click **Stock Allocation** in the page header (an amber
badge counts the items that are short). It lists every item that pending requests are competing for,
with each ward's request and its **fair share** — a proportional split, with any spare unit going to the
earliest request. Adjust as needed and **Save**; each request's review then starts from those figures.

### Final approval
🔒 *Hospital Administrator*

Click **Final Approve** on a request in **Admin Approval**, review the allocated quantities, and
**Approve**. The stock is released to the ward on the spot — or the request waits as **Awaiting Stock**
if the storeroom has since run short.

If the requesting department has a budget for the year, the review box shows what it has left and
what this request is estimated to cost (see [Department Budgets](#15-procurement--department-budgets)).
It never blocks the approval — the estimate isn't the final cost, so the budget is enforced when the
purchase order is raised.

### Releasing a request that was waiting on stock
🔒 *Inventory Officer, Hospital Administrator* — on an **Awaiting Stock** request, click **Release** once
the stock is in. If anything is still short, the system tells you exactly which items and how much is on
hand, and nothing is issued.

### Viewing details
Click **View** on any request to see its progress bar, items (with the **Allocated** and **Released**
quantities once Inventory has acted), purpose, attachments, and full **approval history** (who did what,
when, with remarks). A **QR code of the request number** sits at the top right
of the panel — see below.

### QR codes for requests
Every request carries a scannable QR code of its **request number**.

- **On screen:** open **View** — the QR is at the top right, with the request number printed beneath it.
- **On paper:** click **QR Labels** in the page header for a printable sheet covering every request
  currently listed (one label each: QR, department, request number, item count and date). Allow
  pop-ups, then print and cut along the dashed guides.

**What scanning does:** press **Ctrl + K** to open global search, then scan the code. The scanner types
the request number into the search box and the request comes straight up — no hunting through the list.
Staple a label to the printed RIS or Purchase Request form and anyone holding the paperwork can pull up
the live record in seconds.

---

## 13. Procurement — Department Requests

**Sidebar → Procurement → Dept. Requests.** 🔒 *Super Admin, Hospital Administrator, Department Head,
Department (Shared PC).*

A department-scoped version of the requests page — it shows only **your department's** requests and
drops the cost column. Create a request as a **draft**, review live item availability as you build it
(Available / Not Available / below-reorder indicators), then **Submit** it into the same workflow
described above. The same progress bar, aging flags and attachments panel apply here. You must have a
department assigned to your account.

**On a shared ward PC** (the *Department (Shared PC)* account), the account belongs to the ward, not to
a person — so **Requested By** must be filled in on every request. That typed name is what appears as
*Requested by (End User)* on the printed RIS, and it's the only record of who actually needed the
supplies. Shared accounts can file and submit requests and see the ward's stock; approvals stay with
named users.

---

## 14. Procurement — Purchase Orders & Deliveries

Turns approved [Purchase Requests](#16-procurement--purchase-requests-storeroom-replenishment) into
orders and receives the goods into central stock. **Sidebar → Procurement → Purchase
Orders.**

Top cards summarize **Total POs**, **Pending Delivery**, and **Delivered**.

### Generating a purchase order
🔒 *Hospital Administrator, Procurement Staff*
1. Click **Generate PO** (only appears when there are approved requests waiting) — or click **Create PO**
   on an approved Purchase Request, which opens this form with the request already picked.
2. Choose the **Approved Request**. Its estimated unit costs are filled in as a starting point.
3. Enter or correct the **unit cost** for each line — a running **Total** is calculated.
4. **Generate PO**.

Once you pick a request, a panel shows the department's remaining budget for the year and updates
as you type costs — telling you what the order leaves behind, or by how much it overruns. An order
that would take the department past its budget is **rejected** with the exact shortfall, unless an
administrator has switched enforcement off. Departments with no budget set aren't checked. See
[Department Budgets](#15-procurement--department-budgets).

### Confirming a delivery (supports partial deliveries)
🔒 *Super Admin, Procurement Staff*

Suppliers often deliver an order in instalments. Record **each shipment as it arrives** — the system
keeps a dated log per line, the same as the notes the supply office writes beside each PO line
(*"37 = 8/18/26, 3 = 8/10/26 — Fully delivered"*).

1. On a PO that isn't fully delivered, click **Deliver**. The modal lists only lines with something
   still outstanding, showing *"Outstanding: 30 (of 50 ordered)"*, with any earlier shipments for that
   line listed under the item name.
2. Enter the shipment details at the top:
   - **Date Delivered** — the day the goods actually arrived. Defaults to today. You can pick an earlier
     date if you're keying the receipt in late, but not a future date or a date before the PO was
     generated.
   - **DR / Invoice No.** — the supplier's delivery receipt number (optional, but makes the log easy
     to match against the paperwork).
3. For each line, enter **Qty Received** (defaults to the outstanding amount — enter less for a partial
   shipment, or 0 if that line wasn't in this delivery) plus the **Lot / Batch No.** and **Expiration
   Date** from the physical delivery.
4. **Confirm Delivery** — stock goes up, a **batch** is created per received line (dated with the
   delivery date and carrying the PO's unit cost for valuation), a Receipt movement is recorded with
   the date and reference in its remarks, and the shipment is added to each line's delivery log.

The PO's status runs **Pending → Partial → Delivered**; it only closes when every line reaches its
ordered quantity, and the underlying request flips to **Delivered** at that point (the PO's delivered
date is the day the last shipment arrived). Receiving more than the outstanding amount is rejected with
a per-item message.

### Viewing & printing a PO
Click **View** to see totals and line items. Each line shows:
- **Ordered**, **Delivered**, and **Balance** — the balance turns into a green **Fully delivered** badge
  once the line is complete.
- The **delivery log** under the item name, one entry per shipment: *"3 pc on Oct 1, 2026 · Ref.
  DR-1001 · Lot A7"*.

The status at the top reads **Pending Delivery**, **Partially Delivered**, or **Delivered (date)**.
**Print PO** opens a clean, print-ready purchase order including the log (allow pop-ups).

> POs delivered before the delivery log existed show their history too: each earlier receipt appears
> with the date its batch was received. Very old deliveries that left no batch appear as a single
> entry marked *"(recorded before delivery log)"*.

### QR codes for purchase orders
Every PO carries a scannable QR code of its **PO number**.

- **On screen:** open **View** — the QR is at the top right, beside the totals.
- **On the printed PO:** the QR is inside the printed area, so **Print PO** puts it on the paper copy
  automatically. Nothing extra to do.
- **On paper labels:** click **QR Labels** in the page header for a printable sheet covering every PO
  listed (QR, PO number, request number and delivery status).

**What scanning does:** press **Ctrl + K** to open global search and scan the code — the PO comes
straight up. In practice: stick a label on each incoming delivery box, and the receiving officer scans
it to open the right PO before clicking **Deliver**. No more matching paperwork by hand.

---

## 15. Procurement — Department Budgets

Each department can be given an **appropriation** for a fiscal year — the calendar year, matching
the LGU annual budget cycle. The system measures spend against it and can stop a purchase order
that would overrun it. **Sidebar → Procurement → Budgets.**

Administrators set the figures. Procurement staff see every department; a department head sees
only their own.

### Reading the page

Pick the fiscal year at the top right. Every department is listed, whether or not it has a budget:

| Column | Meaning |
|---|---|
| **Budget** | The appropriation you entered for that year. "Not set" means the department is **unbudgeted** — nothing is checked or blocked for it. |
| **Committed** | Total of the purchase orders raised against that department's requests during the year. This is money promised to a supplier. |
| **Remaining** | Budget minus committed. Turns red once it goes negative. |
| **Utilisation** | The same as a bar — green, amber from 90%, red at 100% and over. |
| **Pending Requests** | Estimated value of requests still in the approval chain with no purchase order yet. Informational only: estimates are not commitments and never block anything. |

Committed spend is never stored — it is added up from the purchase orders themselves every time
you open the page. Amend or void an order and the figures correct themselves.

### Setting a budget

1. Click the **pencil** on the department's row.
2. Enter the appropriation for the year and, optionally, a note (e.g. the board resolution number).
3. **Save Budget.**

The modal shows what has already been committed that year, so you can see immediately whether the
figure you are entering is already spent.

Use the **bin** to remove a budget. The department goes back to being unbudgeted and its purchase
orders stop being checked.

### Exporting the figures

**Export** (top right) downloads an Excel sheet for the selected fiscal year: a summary block, every
department's appropriation against what it has committed, and — in a separate table, so the two are
never added together — the estimated value of requests that have no purchase order yet. This is the
sheet to bring to the annual budget review or hand to COA.

### How the budget is enforced

The check happens when the **purchase order is generated** — not at approval. That is the moment
money is actually committed to a supplier, and the first point where real supplier costs are known
rather than the requester's estimates.

- If the order would take the department past its remaining budget, it is **rejected**, and the
  message names the exact shortfall.
- Administrators can turn this into a warning instead: **Settings → System → Enforce department
  budgets**. With it off the order goes through and administrators are notified of the overrun.
- Either way, administrators are notified when a department passes **90%** of its budget.
- Departments with no budget set are never checked.

### Where you see the balance before committing

- **Reviewing a request** (Procurement → Requests): the review box shows the department's remaining
  budget and the request's estimated value. Approving is never blocked here — the estimate is not
  the final cost.
- **Generating a purchase order**: the panel updates as you type unit costs, showing what the order
  leaves behind, or by how much it overruns.

---

## 16. Procurement — Purchase Requests (storeroom replenishment)

How the storeroom restocks itself. **Sidebar → Procurement → Requests → Purchase Requests tab.**
Procurement Staff land on this tab by default.

A Purchase Request (PR) buys stock **for central stock** — it is never allocated or released to a
ward. It follows its own four steps:

1. **Draft** — the Supply Officer builds the PR.
2. **Chief Approval** — the Hospital Administrator approves it as Chief of Hospital.
3. **Purchase Order** — Procurement generates the PO.
4. **Delivered** — the goods arrive (possibly in several shipments) and go into central stock.

### Creating a Purchase Request
🔒 *Super Admin, Hospital Administrator, Procurement Staff*
1. On the **Purchase Requests** tab, click **New Purchase Request** — or use **Reorder** /
   **Request Replenishment** on the Items page, which pre-fills low-stock items with suggested
   quantities.
2. Fill in the **Office / Section**, and optionally **Fund**, **Section** and **FPP** (usually assigned
   later by the provincial offices — leave them blank to write on the printout).
3. Enter the **Purpose** the way it should read on the form, e.g. *"Medical supplies for use of
   Pangasinan Provincial Hospital July – December CY 2026"*.
4. Add the items and quantities, with an **Estimated Unit Cost** where you have one.
5. **Save Draft**, or **Save & Submit** to send it to the Chief.

> **One PR per category per semester.** The supply office raises separate PRs for medical, office and
> janitorial supplies, each for a half-year, so each prints as its own Appendix 47 form.

### Chief approval
🔒 *Hospital Administrator* — click **Chief Approval** on a submitted PR, then **Approve**, **Reject**, or
**Return** (remarks required for the last two). Approval notifies Procurement to raise the PO; the
badge reads **Approved – for PO**.

### From approval to delivery
Click **Create PO** on the approved PR to [generate the purchase order](#generating-a-purchase-order),
then [confirm each delivery](#confirming-a-delivery-supports-partial-deliveries) as it arrives. When the
last line is fully delivered the PR shows **Delivered**, and any ward requests that were **Awaiting
Stock** can be released.

### Printing the PR
Open the PR with **View** and click **PR Form** for the Appendix 47 form — see
[Official forms](#official-forms-ris--pr).

---

## 17. Analytics — Demand Forecasting

Predicts future monthly demand from consumption history. **Sidebar → Analytics → Demand Forecast.**
Updates live when forecasts change.

### Getting a forecast
1. **Search and select an item.**
2. You'll see summary cards — **forecasted demand** for the next month, **suggested reorder** (+10%
   buffer), the **method** in use, and **current stock** — plus a **Consumption vs Forecast** trend
   chart, the monthly **consumption records** table, and the **forecast records** table (with actuals and
   absolute error once a period completes).

### Generating a new forecast
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Choose a **method** (or "Item default") and how many **months ahead** (1–12).
2. Click **Generate Forecast**.

### Feeding it data
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
- **Add Consumption** — manually enter a month/year's consumed quantity (overwrites any existing record
  for that month). Useful for back-filling history.
- **Sync Records** — rebuilds consumption records from actual stock movements so forecasts reflect real
  issuances.

> **The two methods.** *Moving Average* averages the last *N* months (good for steady demand).
> *Exponential Smoothing* weights recent months more heavily via α (reacts faster to trend changes).
> Set an item's preferred method on its Item record.

### Anomaly alerts
When a completed month's actual consumption deviates sharply from its forecast (50%+ and at least 10
units), inventory officers are notified automatically — an early signal of a stockout risk or a data
error. Each month only alerts once, even if forecasts are regenerated.

---

## 18. Analytics — Reports

**Sidebar → Analytics → Reports.** Four report types. You always **see the data as charts first**, then
decide whether to generate the file — so nothing is exported before you've checked it looks right.

### The steps

1. **Pick the report type** — Consumption, Procurement, Forecast Accuracy, or Item Rankings (the buttons
   at the top).
2. **Set the filter and click "Visualize Data"** — a **year** for Consumption, Forecast Accuracy and
   Item Rankings, a
   **date range** for Procurement. The page fills with summary cards and charts for exactly that slice.
3. **Generate the report** — the **Generate Excel** and **Generate PDF** buttons appear in the header only
   once the data is on screen, and they use the same filters you just previewed.

### What each report visualizes

1. **Consumption Report** (by year) — total consumption, unique items, peak month, and average per month,
   plus: a **monthly bar chart** with the monthly average drawn as a reference line; **consumption by
   category** (every consumed item, with each category's share of the annual total); and **top consumed
   items** ranked by quantity.
2. **Procurement Report** (by date range) — request counts, total PO value, and delivered POs, plus:
   **requests by status** across the whole approval pipeline; **fulfillment meters** for POs delivered and
   requests fully approved.
3. **Forecast Accuracy** (by year) — forecasts generated, method split, overall **MAE** (mean absolute
   error), and how many items sit below their reorder point, plus: **projected demand vs stock on hand**
   for the items with the largest shortfalls; **forecast error (MAE) by item**; and the full per-item
   summary table.
4. **Item Rankings** (by year) — the **most used** items (units issued) or the **most procured** items
   (units ordered on purchase orders), switchable with the **Ranking** dropdown. Each item shows its
   category; the **Category** dropdown ranks within one category or shows every category's own
   leaderboard side by side, and **Show** sets how many items are listed. The Consumption Report includes
   the same rankings at the bottom.

### Reading the charts

- **Hover any bar** for a tooltip with the full label and exact value.
- Every chart card has a **chart / table toggle** in its top-right corner — switch to the table when you
  want the precise numbers (and extras the chart doesn't show, like each category's share of the total)
  rather than the shape.
- The charts follow the light or dark theme you chose in
  [Settings → Appearance](#24-settings).

### Generating the file

- **Generate Excel** downloads a formatted workbook — hospital letterhead, the filters you applied, a
  summary block, and styled tables — using the same filters as the on-screen preview.
- **Generate PDF** opens a clean printable version of what you're looking at (allow pop-ups; choose
  "Save as PDF" from the print dialog). Whichever view each card is showing — chart or table — is what
  lands in the PDF, so switch a card to its table first if you want the numbers printed instead.

> Administrators can also switch on a **monthly summary email** (Settings → System) that sends the key
> figures for the previous month to all administrators on the 1st, automatically.

---

## 19. Notifications

**Sidebar → Main → Notifications** (or the 🔔 bell). System alerts arrive in real time.

- **Groups:** All, Inventory, Procurement, Adjustments, Other. Summary cards count each.
- Toggle **Unread only** to focus on what's new.
- Each card is colour-coded by type (low stock, expiry, adjustment updates, request/PO/budget events).
- Click **Mark read** on one, or **Mark All Read** in the header.

Types: Low Stock, Expiration Warning, Adjustment Requested/Approved/Rejected, Request
Submitted/Approved/Rejected/Returned for Revision, Purchase Order Generated, Budget Alert, and
general notices.

Notifications can also reach you **by email** — control that per category under
[Settings → Profile](#24-settings). Old notifications are cleaned up automatically after the retention
period the administrators configured.

---

## 20. Administration — Users

🔒 *Super Admin, Hospital Administrator.* **Sidebar → Administration → Users.**

### Viewing
Search by name or username; the table shows role, department, active status, and last login.

### Adding a user
New accounts are created here by the administrator — no database or seeder changes are needed.

1. Click **Add User**.
2. Fill in the person's details: first/last name (middle optional), **Username**, **Employee ID**,
   **Email**, and an **Initial Password** meeting the policy (live hints shown).
3. Choose their **Role** (Inventory Officer, Procurement Staff, Department Head, Department Staff
   (Shared PC), and — for a Super Admin only — Hospital Administrator / Super Admin).
4. Choose their **Department**. It's required for **Department Head** and **Department Staff**, since
   those accounts only see and request for their own department.
5. Click **Add User**. Username, email and Employee ID must each be unused — the form tells you if one
   is already taken. (Username and Employee ID can't be changed later.) The user is **forced to set
   their own password on first login** — the one you typed is only a handover credential.

### Editing a user
✏️ pencil → change name, role, department, email, and **Active/Inactive** status.

> **Deactivating an account cuts off its access within seconds** — even sessions that are already
> signed in stop working. Use it the moment someone leaves or a credential is suspected compromised.

### Resetting a password
Click **Reset PW**, enter a new password (policy-checked). All of that user's active sessions are signed
out, and they must set their own new password at next login.

---

## 21. Administration — Departments & Categories

🔒 *Super Admin, Hospital Administrator.*

- **Departments** (*Sidebar → Administration → Departments*) — create, edit, and remove the hospital
  departments that users, requests, and department stock balances belong to. Each can record a
  **Head of Department** (free text — the head is often not a system user); that name is printed on
  the **Received by** line of the department's [RIS forms](#12-procurement--requests--the-approval-workflow),
  so the paperwork comes out ready to sign.
- **Categories** (*Sidebar → Administration → Categories*) — create, edit, and remove the categories used
  to classify inventory items. Categories must exist before items (and before bulk import) can reference
  them.

Both are straightforward list pages: **Add**, ✏️ edit, and 🗑 delete, with a usage count shown per row.

---

## 22. Administration — Backups

🔒 *Super Admin, Hospital Administrator.* **Sidebar → Administration → Backups.**

Every backup run produces **two files**:
- an **Excel data export** — human-readable, for audits and spot-checks: one sheet per table,
  covering ward balances and department budgets as well as stock and procurement. It deliberately
  excludes password hashes and sign-in tokens, and
- a **SQL database backup (`.bak`)** — the file that actually restores the system.

Backups run automatically every day and are removed after the retention period (Settings → System).

### Day-to-day
- **Run Backup Now** — create a backup immediately.
- **Daily backup time** — set when the automatic daily backup runs, then **Save Schedule**.
- Each row shows date, file, type (Scheduled/Manual), status, record count, size, and who triggered it.
- **⬇ Download** the Excel export, or the **🗄 storage icon** to download the `.bak`.
- **✅ Verify** runs an integrity check (`RESTORE VERIFYONLY`) on the `.bak` and tells you whether it is
  genuinely restorable. **Do this regularly — a backup is only as good as its last test.** The result is
  audit-logged.
- 🗑 **Delete** removes both files (permanent).

### Restoring after a disaster
Click **Restore Guide** for the full walkthrough. In short: stop the application, restore the `.bak`
with `sqlcmd` (the guide gives the exact command to copy), restart the app (newer migrations apply
automatically), and have everyone sign in again. Restoring overwrites everything entered after the
backup was taken — the guide spells out the warnings.

> There is deliberately no "Restore" button in the app: an application cannot safely restore the very
> database it is running on. The guide is the safe path.

---

## 23. Administration — Audit Logs

🔒 *Super Admin, Hospital Administrator.* **Sidebar → Administration → Audit Logs.**

A searchable trail of sensitive actions.
1. Set filters: **search text**, **Action** (Login, Create, Update, Delete, Approve, Reject, Generate),
   and a **date range**.
2. **Apply Filters** to load matching entries — each shows timestamp, user, action, table, record ID,
   details, and IP address. Results are paged; the header shows the true total found.
3. **Export CSV** downloads the full filtered set (up to 1,000 rows) — not just the visible page.

What gets logged: sign-ins (including failures and lockouts), password changes/resets, item imports and merges,
batch corrections and disposals, movements and voids, cycle counts, request/approval actions,
attachment uploads/deletions, PO generation and deliveries, backup runs and verifications, user
administration, and settings changes.

---

## 24. Settings

Open via the **name chip → Profile Settings** (top-right). Tabs:

### Profile
Edit your own **name and email**, and choose which **email notifications** you receive — a master
switch plus per-category toggles for inventory alerts, procurement updates, and stock adjustments. Keep
your email current — it's where 2FA fallback codes and reset links are sent.

### Security
- **Change Password** — enter current + new (twice). The password policy is shown and checked live.
  Changing your password signs out all your other sessions.
- **Two-Factor Authentication** — **Enable 2FA** to require a code at every login (you need an email
  address on your profile first), or **Disable 2FA**.
- **Authenticator App** — the stronger option:
  1. Click **Set Up** — a QR code and a manual-entry key appear.
  2. Scan the QR with Google/Microsoft Authenticator (or type the key).
  3. Enter the 6-digit code the app shows and click **Verify & Enable**.
  From then on, sign-in codes come from your phone — they work offline and don't depend on the mail
  server. **Remove** drops the authenticator; if 2FA is still enabled, email codes take over again.

### Preferences *(saved on this device)*
- **Default start page**, **auto sign-out when idle** (15/30/60 minutes or never), **rows per table
  page** (10/25/50/100 — used by every paged table).
- **Notification pop-ups** and **notification sound** toggles.
- **24-hour time**, **dashboard welcome banner**.
- **Reset to defaults** restores all Preferences and Display settings on this device.

### Appearance / Display *(saved on this device)*
- **Theme** — **Light**, **Dark**, or **System** (match your device).
- **Reduce motion**, **Compact tables**, **Start with sidebar collapsed**.

### System *(administrators only)*
Server-wide settings that apply to everyone:
- **Organization name** (shown in the top bar and on exported documents), **daily backup time**,
  **backup retention (days)**.
- **New item defaults** — default expiration warning and reorder threshold pre-filled when items are
  created.
- **Password policy** — minimum length (8–64) and whether a special character is required (an uppercase,
  lowercase, and number are always required). Enforced everywhere a password is set.
- **Data & reports** — **notification retention** and **audit-log retention** in days (0 keeps forever;
  cleanup runs nightly), and the **monthly summary email** toggle (emails administrators a
  previous-month summary on the 1st).
- **Procurement budgets** — **Enforce department budgets**. On (the default), a purchase order that
  would take a department past its fiscal-year budget is rejected; off, it goes through and
  administrators are notified instead. Departments with no budget set are never checked either way.
  The figures themselves live on the [Budgets page](#15-procurement--department-budgets).
- **Purchase Request form** — what prints on every [PR Form](#official-forms-ris--pr): the **LGU**
  line, the **Department** (*PPH*), and the three signatories — **Requested by**, **Cash
  Availability**, and **For & By Authority of the Governor** — each with a printed name and a
  designation. Type names exactly as they should appear, titles and post-nominals included
  (e.g. *Juan Dela Cruz, MD, DPBS, FPSGS, FPCS*). A blank name prints as an empty signing line.
- **Requisition and Issue Slip** — what prints on every [RIS](#official-forms-ris--pr): the
  **letterhead address** and **certification line** (ISO / CIP), the two **approvers** (names and
  designations — *OIC - Chief of Ancillary Service* and *Chief Nurse* by default), and the document
  control fields **Form code**, **Revision No.** and **Revision date**. When the form is revised, update
  these three fields — no system change is needed.

  > **Seals on the RIS letterhead.** The province and hospital seals are image files on the server,
  > not a setting. Ask whoever maintains the server to place clean PNGs (square, transparent
  > background) at `PPHIPMSystem.Server/Assets/Forms/province-seal.png` and `hospital-seal.png`.
  > Without them the letterhead prints the text only.
- **Announcement** — the hospital-wide banner message, with optional **show-from / show-until** times so
  maintenance notices appear and clear themselves on schedule.

### About
System/version information.

---

## 25. Key concepts explained

**FEFO (First-Expire-First-Out).** When you issue or dispose stock, the system draws it from the batch
that expires **soonest** first. This keeps physical shelves and the system's batch quantities aligned and
minimizes waste. Stock that predates batch tracking is drawn down without a batch.

**Movements vs Adjustments.** A **movement** is a normal, immediate stock change (receipt, issuance,
return, disposal). An **adjustment** is a correction to match a physical count and **requires approval**
before it takes effect.

**Voiding.** Corrections are non-destructive — the original record is kept and a compensating entry
reverses it, so the audit trail stays intact. Voids also undo batch consumption, consumption records,
and department balances that the original movement touched.

**Department stock.** Central stock is what the storeroom holds; **department stock** is what has been
issued out to a ward and not yet returned or used up. Together they account for everything the hospital
owns — which is why the snapshot export keeps them on separate, non-overlapping sheets.

**Where consumption is counted.** An item is counted as consumed **once**, at the moment it is
**issued** from the storeroom — that's what lowers central stock and what feeds demand forecasting.
Recording **ward usage** afterwards is a second, separate ledger: it only draws down the department's
balance so the ward's figures match its shelf. Keeping these apart is what stops the same units being
subtracted twice and the forecasts coming out double.

**The two procurement chains.**
- *Ward request:* Draft → (submit) → Inventory review & allocation → Admin approval → **Released** into
  the ward's stock — or **Awaiting Stock** until the storeroom is restocked, then released.
- *Purchase Request:* Draft → (submit) → Chief approval → Purchase Order → Delivery (possibly in parts)
  → central stock + batches.

Any reviewer can reject or return for revision along the way.

**Reorder threshold.** Each item's low-stock trigger. Dropping to/below it flags the item, drives the
Low Stock dashboard/notifications, and enables the one-click reorder buttons.

**Reorder vs Replenish.** *Reorder* raises a procurement **request to buy** stock you don't have yet.
*Replenish* records stock that has **physically arrived** and puts it on the shelf as a batch. Both live
on the Inventory Items page, and both work on a single row or on everything you've ticked.

**All-or-nothing receipts.** Multi-line actions that change stock (Replenish, cycle counts, deliveries)
are applied in one step. If any line is rejected, nothing is written — so a failed submission never
leaves you guessing which half went through, and you can safely fix and resubmit.

**QR codes.** Four things carry a scannable code: **items** (item code), **batches** (lot number),
**procurement requests** (request number), and **purchase orders** (PO number). A handheld scanner just
types that text wherever the cursor is — into a search picker to select an item, or into global search
(**Ctrl + K**) to pull up a request or PO.

**Unit cost & valuation.** Batches carry the price paid for them (automatically from POs, optionally on
manual receipts). The inventory snapshot's Valuation sheet turns that into "what is our stock worth".

**Real-time updates.** The dashboard, forecasts, and notifications update live via server push — you
rarely need to refresh.

---

## 26. Keyboard shortcuts & tips

- **Ctrl + K / ⌘ + K** — focus global search from anywhere.
- In search and dropdowns: **↑ / ↓** to move, **Enter** to select, **Esc** to close.
- **Type-to-filter dropdowns** — the searchable pickers (items, departments) accept a barcode
  scanner's input too: print QR labels from the Items or Batches pages, focus a picker, scan, Enter.
- **Scan a request or PO straight to its record** — press **Ctrl + K**, then scan the QR label on the
  paperwork or delivery box.
- **Tick boxes beat repetition** — on the Inventory Items page, select several rows and use the green
  action bar to reorder, replenish, or label them all in one go instead of row by row.
- **Low stock → reorder in one click** — use the **Reorder** / **Create PR** / **Request Replenishment**
  buttons on the Dashboard and Inventory pages instead of building requests from scratch.
- **Motion too much?** Settings → Appearance → **Reduce motion** turns off the page and hover
  animations. The system also follows your operating system's "reduce motion" setting automatically.
- **Attach the paperwork** — quotations and canvass sheets belong on the request itself (View →
  Attachments), not in someone's inbox.
- **Verify your backups** — the ✅ Verify button on the Backups page takes seconds; make it a habit.
- **Prefer Dark mode?** Settings → Appearance → Theme → **Dark** (or **System** to follow your OS).
- **Export anything important** — inventory snapshots (with valuation), reports, RIS/PR forms, disposal
  certificates, and audit logs all export to Excel/CSV for filing.
- **Check the charts before you generate** — on the Reports page, **Visualize Data** shows the figures on
  screen first; flip any chart card to its **table view** if you need the exact numbers, then generate.
- **Pop-ups** — printing POs, reports, and labels opens a new window; allow pop-ups for this site.

---

*Pangasinan Provincial Hospital — Inventory & Procurement Management System. Access is restricted to
authorized hospital staff; contact your system administrator if you cannot sign in or need a role change.*
