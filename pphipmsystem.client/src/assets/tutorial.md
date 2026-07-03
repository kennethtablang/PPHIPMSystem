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
11. [Procurement — Requests & the approval workflow](#11-procurement--requests--the-approval-workflow)
12. [Procurement — Department Requests](#12-procurement--department-requests)
13. [Procurement — Purchase Orders & Deliveries](#13-procurement--purchase-orders--deliveries)
14. [Procurement — Suppliers](#14-procurement--suppliers)
15. [Analytics — Demand Forecasting](#15-analytics--demand-forecasting)
16. [Analytics — Reports](#16-analytics--reports)
17. [Notifications](#17-notifications)
18. [Administration — Users](#18-administration--users)
19. [Administration — Departments & Categories](#19-administration--departments--categories)
20. [Administration — Backups](#20-administration--backups)
21. [Administration — Audit Logs](#21-administration--audit-logs)
22. [Settings (your profile, security, preferences, appearance, system)](#22-settings)
23. [Key concepts explained](#23-key-concepts-explained)
24. [Keyboard shortcuts & tips](#24-keyboard-shortcuts--tips)

---

## 1. What the system does

PPH IPMS is a single platform that replaces spreadsheets for three jobs:

- **Inventory** — track every supply and pharmaceutical item, its stock level, its batches, and their
  expiration dates. Every increase or decrease in stock is recorded as a movement.
- **Procurement** — raise supply requests, route them through a multi-level approval workflow, turn
  approved requests into purchase orders, and receive deliveries against them.
- **Analytics** — forecast future demand from consumption history and produce consumption,
  procurement, and forecast-accuracy reports.

Everything is auditable: sensitive actions are written to an audit log, and the database is backed up
automatically every day.

---

## 2. Roles at a glance

Your **role** decides which menus and buttons you see. There are five:

| Role | What they mainly do |
|------|--------------------|
| **Super Admin** | Full access to everything, including administration. |
| **Hospital Administrator** | Full operational access — inventory, procurement, approvals, reports, and administration. |
| **Inventory Officer** | Manages items, batches, stock movements, adjustments; approves at the inventory step of procurement; runs forecasts. |
| **Procurement Staff** | Manages suppliers and purchase orders; approves at the procurement step; sees reports. |
| **Department Head** | Raises supply requests for their department and tracks them. |

Throughout this guide, the "🔒 Who can do this" note names the roles allowed to perform each action.

---

## 3. Signing in

### Logging in
1. Open the app. You land on the **Sign In** screen.
2. Enter your **Username** (e.g. `admin.santos`) and **Password**.
3. Use the 👁 eye icon in the password box to reveal what you typed.
4. Click **Sign In**.

If your username/password is wrong — or your account has been deactivated — you'll see an error. After
several failed attempts the account is temporarily locked; wait and try again, or ask an administrator.

### Two-factor authentication (2FA)
If you have 2FA turned on (see [Settings → Security](#22-settings)), after your password the system
emails you a **6-digit verification code**:
1. Check your registered email for the code.
2. Type it into the **Verification Code** box and click **Sign In**.

Codes expire after a short time — if it doesn't work, sign in again to get a fresh one.

### First login after your account is created or reset
Seeded and admin-reset accounts are handed a temporary password, so the system forces you to set your
own on first sign-in. You'll be redirected to a **Change Password** screen — choose a new password that
meets the policy, and you'll be taken into the app.

### Forgot your password
1. On the login screen, click **Forgot your password?**
2. Enter your email; the system sends a reset link.
3. Open the link and set a new password.

---

## 4. Getting around

### The sidebar (left)
Groups your menus: **Main**, **Inventory**, **Procurement**, **Analytics**, and **Administration**.
You only see the groups your role can use. Collapse/expand it with the arrow button at the top — or set
it to start collapsed under [Settings → Appearance](#22-settings).

### The top bar
- **Page title** — the name of where you are.
- **🔍 Global search** — see below.
- **🔄 Refresh** — reloads the current page.
- **🔔 Notifications bell** — a red badge shows your unread count; click to open the Notifications page.
- **Your name chip** — click it for **Profile Settings** and **Sign Out**.

### Global search (Ctrl + K)
1. Press **Ctrl + K** (or **⌘ + K** on Mac) anywhere to jump into the search box.
2. Type at least 2 characters. It searches **inventory items, suppliers, procurement requests,
   purchase orders, and users**.
3. Use **↑ / ↓** arrow keys to move through results and **Enter** to open the highlighted one, or click
   any result. **Esc** closes it.

### Notification pop-ups & sound
New notifications arrive live (no refresh needed). Whether they show as pop-up "toasts" and whether they
chime is up to you — toggle both under [Settings → Preferences](#22-settings). The bell badge always
updates regardless.

### Announcement banner
Administrators can post a hospital-wide message (e.g. "maintenance this Sunday"). It shows as a banner
at the top until you dismiss it, or until its scheduled end time passes.

---

## 5. Dashboard

The **Dashboard** is your home screen and updates in real time as other people record stock changes.

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
- **Search** by name or code.
- Filter by **Category**.
- Tick **Low Stock Only** to see just the items at or below their reorder threshold.

### Reading a row
Code, name, category, unit, **Supplies Available** (turns red with a ⚠ when below reorder), reorder
point, forecast method, and status (**Available / Not Available / Inactive**).

### Adding an item
🔒 *Hospital Administrator, Inventory Officer*
1. Click **Add Item**.
2. Fill in **Item Name**, **Category**, and **Unit of Measure** (required), plus optional **Item Code**
   and **Description**.
3. Set the **Reorder Threshold** (the low-stock trigger) and **Expiration Warning (days)**.
4. Choose the **Forecast Method**:
   - **Moving Average** — set the **MA window** (number of past months to average).
   - **Exponential Smoothing** — set the **smoothing constant α** (0.01–0.99).
5. Click **Create Item**. (New items are pre-filled with the admin's default reorder / warning values —
   you can override them.)

### Editing an item
🔒 *Hospital Administrator, Inventory Officer* — click the ✏️ pencil, change fields, **Save Changes**.
You can also flip an item between **Active** and **Inactive** here.

### Deleting an item
🔒 *Hospital Administrator, Inventory Officer* — click the 🗑 trash icon and confirm. Items that already
have transactions can't be deleted (deactivate them instead).

### Bulk import from Excel
🔒 *Hospital Administrator, Inventory Officer*
1. Click **Import**.
2. **Download the template** link gives you the correct columns: *Name, Item Code, Description, Unit,
   Category, Reorder Threshold, Expiration Warning Days*. Categories must already exist.
3. Choose your `.xlsx` file and click **Preview**.
4. The preview table marks each row **Ready** or **Error** (with the reason). Fix errors in the file if
   you want them included.
5. Click **Import N Valid Item(s)**. Invalid rows are skipped.

### Export a snapshot
🔒 *Super Admin, Hospital Administrator, Procurement Staff, Inventory Officer* — **Export Snapshot**
downloads the current inventory as an Excel file.

### Request replenishment from here
🔒 *Super Admin, Hospital Administrator, Department Head*
- On a single low-stock row, click **Reorder** to open a procurement request pre-filled for that item.
- With **Low Stock Only** on, click **Request Replenishment (N)** to raise **one** request covering
  every low-stock item shown, each with a suggested quantity.

---

## 7. Inventory — Materials List

**Sidebar → Inventory → Materials List.** A focused, at-a-glance view of stock for quick reference and
lookups. Use it when you just need to check availability without the full management controls of the
Items page.

---

## 8. Inventory — Batches & Expiry

Tracks stock in **batches** (lots), each with its own quantity and expiration date. This is what powers
expiry warnings and **FEFO** issuance (see [Key concepts](#23-key-concepts-explained)).
**Sidebar → Inventory → Batches & Expiry.**

### Viewing batches
- **Expiring Soon** vs **All Batches** toggle.
- In "Expiring Soon", pick a window: **30 / 60 / 90 / 180 days**.
- Each row shows lot number, quantity, remaining, expiration date, days-until-expiry (red when close or
  overdue), and a status badge (**Expired / Critical / Expiring Soon**).

### Receiving a batch manually
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **Receive Batch**.
2. Pick the **item**, enter **Lot / Batch Number** (optional), **Quantity Received**, **Expiration Date**
   (optional), and **Unit Cost** (optional, used for valuation).
3. Click **Receive Batch** — stock on hand goes up automatically.

> Deliveries against a purchase order create batches for you (see [Purchase Orders](#13-procurement--purchase-orders--deliveries)).
> Use manual receiving for donations or direct purchases.

### Correcting a batch (typo fix)
🔒 *Super Admin, Hospital Administrator, Inventory Officer* — click the ✏️ pencil to fix a wrong **lot
number** or **expiration date** entered at receiving. The change is audit-logged. (Fixing a wrong expiry
matters — it keeps FEFO ordering and expiry warnings correct.)

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
2. Enter a disposal reason.
3. **Dispose All Expired** — every batch past its expiry with remaining stock is written off in one go,
   each generating a Disposal movement.

### Disposal certificate (for COA audits)
🔒 *Super Admin, Hospital Administrator, Inventory Officer*
1. Click **Disposal Certificate**.
2. Choose a **From / To** date range.
3. **Download Excel** — a signed-copy certificate listing every disposal in the period (item, quantity,
   lot, who performed it) with a signature block for filing.

---

## 9. Inventory — Stock Movements

The ledger of every stock increase and decrease. **Sidebar → Inventory → Stock Movements.**

### Movement types
- **Receipt** (+) and **Return** (+) increase stock.
- **Issuance** (−) and **Disposal** (−) decrease stock. Outbound movements consume batches **FEFO**
  (first to expire, first out).

### Reading the table
Type badge, item, signed quantity, before/after quantities, remarks, who performed it, and the date.
Voided movements appear dimmed with a **Voided** badge; the compensating entries carry a **Reversal**
badge.

### Recording a movement
🔒 *Hospital Administrator, Inventory Officer*
1. Click **Record Movement**.
2. Pick the **item** — a live card shows current stock, reorder point, and the projected level after the
   movement (it warns if you'd go below zero).
3. Choose **Movement Type** and enter **Quantity** (and optional **Remarks**).
4. Click **Record**. Issuances also update that item's monthly consumption (used by forecasting), and a
   low-stock alert fires if the item drops below its reorder point.

### Voiding (reversing) a movement
🔒 *Hospital Administrator, Inventory Officer*

Use this when a movement was entered by mistake. Voiding **doesn't delete** anything — the original stays
on record (flagged as voided) and the system posts a **compensating reversal** that undoes its effect.

1. Click **Void** on the movement's row.
2. Enter a **reason** (required).
3. **Void Movement**. Stock is corrected: outbound voids add stock back and restore batch quantities;
   inbound voids remove the stock again. Voiding an issuance also rolls back its consumption record.

> Movements linked to a purchase order can't be voided here — correct those through the delivery flow.

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
1. Click **Cycle Count**.
2. Enter a **count reason** that applies to the whole session.
3. Use the filter box to find items; type the **counted quantity** next to each item you physically
   checked — leave the rest blank. Each row shows the variance (or **Match**).
4. The footer tallies "counted" and "with variance". Click **Submit N Adjustment(s)** — every item whose
   count differs from the record becomes a pending adjustment; matches are noted but create nothing.

### Reviewing / approving an adjustment
🔒 *Super Admin, Hospital Administrator*
1. On a **Pending** row, click **Review**.
2. See the recorded vs physical counts and the variance.
3. Choose **Approve** (stock is updated to the physical count) or **Reject** (a remark is required), then
   confirm.

---

## 11. Procurement — Requests & the approval workflow

Where supply requests are raised and routed for approval. **Sidebar → Procurement → Requests.**

### The approval workflow
A request moves through these stages (shown as status badges):

1. **Draft** (`Submitted by Department`) — created but not yet sent.
2. **Submit** → **Pending Procurement** (`Submitted to Procurement`).
3. **Procurement review** → **Procurement Approved**.
4. **Inventory review** → **Inventory Approved**.
5. **Final approval** (admin) → **Fully Approved** — now eligible to become a Purchase Order.
6. From there: **PO Generated** → **Delivered**.

At any review step an approver can **Approve**, **Reject**, or **Return for revision** (sends it back to
the requester to fix and resubmit). A request can also be **Returned**.

### Aging indicator
Requests waiting more than **7 days** without action are flagged ("waiting Nd"), and a banner summarizes
how many are stalled — so nothing silently sits.

### Creating a request
🔒 *Super Admin, Hospital Administrator, Department Head*
1. Click **New Request**.
2. Enter a **Justification**.
3. Add one or more **item lines**: pick the item (availability is shown), enter **Qty**, an optional
   **Estimated Unit Cost** (non–Department-Head roles), and optional **Remarks**. **Add Item** for more
   lines; the × removes a line.
4. **Submit Request**.

> Coming from a Dashboard/Inventory "reorder" button pre-fills the form for you.

### Submitting a draft
🔒 *Super Admin, Hospital Administrator, Department Head* — on a **Draft** or **Returned** request, click
**Submit** to push it into the procurement workflow.

### Reviewing a request
🔒 depends on the stage — *Procurement Staff* review the procurement step, *Inventory Officers* the
inventory step, *Administrators* give final approval. Click the stage's review button, pick
**Approve / Reject / Return**, add remarks (required for reject/return), and confirm.

### Viewing details
Click **View** on any request to see its items, justification, and full **approval history** (who did
what, when, with remarks).

---

## 12. Procurement — Department Requests

**Sidebar → Procurement → Dept. Requests.** 🔒 *Super Admin, Hospital Administrator, Department Head.*

A department-scoped version of the requests page for Department Heads — it shows only **your
department's** requests and drops the cost column. Create a request as a **draft**, review live item
availability as you build it (Available / Not Available / below-reorder indicators), then **Submit** it
into the same approval workflow described above. You must have a department assigned to your account.

---

## 13. Procurement — Purchase Orders & Deliveries

Turns fully-approved requests into orders and receives the goods. **Sidebar → Procurement → Purchase
Orders.**

Top cards summarize **Total POs**, **Pending Delivery**, and **Delivered**.

### Generating a purchase order
🔒 *Hospital Administrator, Procurement Staff*
1. Click **Generate PO** (only appears when there are fully-approved requests waiting).
2. Choose the **Approved Request** and an **accredited Supplier**.
3. Enter the **unit cost** for each line — a running **Total** is calculated.
4. **Generate PO**.

### Confirming a delivery (supports partial deliveries)
🔒 *Hospital Administrator, Inventory Officer*
1. On a PO that isn't fully delivered, click **Deliver**.
2. For each line, enter **Qty Received** (defaults to the outstanding amount — enter less for a partial
   shipment) plus the **Lot / Batch No.** and **Expiration Date** from the physical delivery.
3. **Confirm Delivery** — stock goes up, a **batch** is created per received line, and a Receipt movement
   is recorded. The PO stays **Partial** until every line is fully delivered, then becomes **Delivered**.

Delivery status on the list shows **Pending / Partial / Delivered**.

### Viewing & printing a PO
Click **View** to see supplier, totals, and line items. **Print PO** opens a clean, print-ready purchase
order (allow pop-ups).

---

## 14. Procurement — Suppliers

**Sidebar → Procurement → Suppliers.** Manage the vendors you order from.

### Viewing
Search by name; each supplier shows contact details, **accreditation** status, and performance
**metrics** (where available). Only **accredited** suppliers can be chosen when generating a PO.

### Adding / editing a supplier
🔒 *Super Admin, Hospital Administrator, Procurement Staff*
1. **Add Supplier** (or ✏️ edit).
2. Fill in name, contact person, email, phone, address, **accreditation number**, whether it's
   **accredited**, and the **accreditation expiry**.
3. Save.

### Order history & metrics
Click the 🕘 history action to see all purchase orders placed with that supplier.

### Deleting
🔒 *Super Admin, Hospital Administrator* — remove a supplier (blocked if it would break existing orders).

---

## 15. Analytics — Demand Forecasting

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
When a month's actual consumption deviates sharply from its forecast, inventory officers are notified
automatically — an early signal of a stockout risk or a data error.

---

## 16. Analytics — Reports

**Sidebar → Analytics → Reports.** Three report types, each with on-screen charts/tables plus export.

1. **Consumption Report** — pick a **year**. Shows total consumption, unique items, peak month, monthly
   bar chart, and top consumed items.
2. **Procurement Report** — pick a **date range**. Shows request counts, total PO value, delivered POs, a
   status pie chart, and top suppliers by amount.
3. **Forecast Accuracy** — pick a **year**. Shows how many forecasts were generated, method split, overall
   **MAE** (mean absolute error), and a per-item summary vs current stock.

For any generated report:
- **Export Excel** downloads it as a spreadsheet.
- **Print / PDF** opens a clean printable version (allow pop-ups; "Save as PDF" from the print dialog).

---

## 17. Notifications

**Sidebar → Main → Notifications** (or the 🔔 bell). System alerts arrive in real time.

- **Groups:** All, Inventory, Procurement, Adjustments. Summary cards count each.
- Toggle **Unread only** to focus on what's new.
- Each card is colour-coded by type (low stock, expiry, adjustment updates, request/PO/delivery events).
- Click **Mark read** on one, or **Mark All Read** in the header.

Types include: Low Stock, Expiration Warning, Stock Out, Adjustment Requested/Approved/Rejected, Request
Submitted/Approved/Rejected/Returned, Purchase Order Generated, and Delivery Confirmed.

---

## 18. Administration — Users

🔒 *Super Admin, Hospital Administrator.* **Sidebar → Administration → Users.**

### Viewing
Search by name or username; the table shows role, department, active status, and last login.

### Creating a user
1. **Add User.**
2. Fill in first/last name (middle optional), **Username**, **Employee ID**, **Role**, optional
   **Department**, **Email**, and an **Initial Password** meeting the policy.
3. **Create.** (Username and Employee ID can't be changed later.) The user is forced to set their own
   password on first login.

### Editing a user
✏️ pencil → change name, role, department, email, and **Active/Inactive** status. Deactivating an account
cuts off its access promptly.

### Resetting a password
Click **Reset PW**, enter a new password (policy-checked). The user must use it on next login (and will be
prompted to change it).

---

## 19. Administration — Departments & Categories

🔒 *Super Admin, Hospital Administrator.*

- **Departments** (*Sidebar → Administration → Departments*) — create, edit, and remove the hospital
  departments that users and requests belong to.
- **Categories** (*Sidebar → Administration → Categories*) — create, edit, and remove the categories used
  to classify inventory items. Categories must exist before items (and before bulk import) can reference
  them.

Both are straightforward list pages: **Add**, ✏️ edit, and 🗑 delete, with a usage count shown per row.

---

## 20. Administration — Backups

🔒 *Super Admin, Hospital Administrator.* **Sidebar → Administration → Backups.**

Daily Excel snapshots of the system for disaster recovery. Backups older than 30 days are removed
automatically.

- **Run Backup Now** — create a backup immediately.
- **Daily backup time** — set the time the automatic daily backup runs, then **Save Schedule**.
- Each backup row shows date, file, type (Scheduled/Manual), status, record count, size, and who
  triggered it.
- **⬇ Download** a successful backup's Excel file, or 🗑 **Delete** one (permanent).

---

## 21. Administration — Audit Logs

🔒 *Super Admin, Hospital Administrator.* **Sidebar → Administration → Audit Logs.**

A searchable trail of sensitive actions.
1. Set filters: **search text**, **Action** (Login, Create, Update, Delete, Approve, Reject, Generate),
   and a **date range**.
2. Apply to load matching entries — each shows timestamp, user, action, table, record ID, details, and IP
   address.
3. **Download** exports the results as a CSV file.

---

## 22. Settings

Open via the **name chip → Profile Settings** (top-right). Tabs:

### Profile
Edit your own **name, email, and phone number**. Keep your email current — it's where 2FA codes and
system emails are sent.

### Security
- **Change Password** — enter current + new (twice). Must meet the password policy.
- **Two-Factor Authentication** — **Enable 2FA** to require an emailed code at every login (you need an
  email address on your profile first), or **Disable 2FA**.

### Preferences *(saved on this device)*
- **Default start page**, **auto sign-out when idle**, **rows per table page**.
- **Notification pop-ups** and **notification sound** toggles.
- **24-hour time**, **dashboard welcome banner**.
- **Reset to defaults** restores all Preferences and Display settings on this device.

### Appearance / Display *(saved on this device)*
- **Theme** — **Light**, **Dark**, or **System** (match your device).
- **Reduce motion**, **Compact tables**, **Start with sidebar collapsed**.

### System *(administrators only)*
Server-wide settings that apply to everyone:
- **Organization name**, **daily backup time**, **backup retention (days)**.
- **New item defaults** — default expiration warning and reorder threshold for new items.
- **Password policy** — minimum length (8–64) and whether a special character is required (an uppercase,
  lowercase, and number are always required).
- **Data & reports** — **notification retention** and **audit-log retention** (0 keeps forever), and a
  **monthly summary email** toggle (emails admins a previous-month summary on the 1st).
- **Announcement** — banner message with optional **show-from / show-until** times.

### About
System/version information.

---

## 23. Key concepts explained

**FEFO (First-Expire-First-Out).** When you issue or dispose stock, the system draws it from the batch
that expires **soonest** first. This keeps physical shelves and the system's batch quantities aligned and
minimizes waste. Stock that predates batch tracking is drawn down without a batch.

**Movements vs Adjustments.** A **movement** is a normal, immediate stock change (receipt, issuance,
return, disposal). An **adjustment** is a correction to match a physical count and **requires approval**
before it takes effect.

**Voiding.** Corrections are non-destructive — the original record is kept and a compensating entry
reverses it, so the audit trail stays intact.

**The procurement chain.** Request → (submit) → Procurement approval → Inventory approval → Final
approval → **Fully Approved** → Purchase Order → Delivery → stock + batches. Any approver can reject or
return for revision along the way.

**Reorder threshold.** Each item's low-stock trigger. Dropping to/below it flags the item, drives the
Low Stock dashboard/notifications, and enables the one-click reorder buttons.

**Real-time updates.** The dashboard, forecasts, and notifications update live via server push — you
rarely need to refresh.

---

## 24. Keyboard shortcuts & tips

- **Ctrl + K / ⌘ + K** — focus global search from anywhere.
- In search and dropdowns: **↑ / ↓** to move, **Enter** to select, **Esc** to close.
- **Type-to-filter dropdowns** — the searchable pickers (items, suppliers) accept a barcode scanner's
  input too (scanners type the value + Enter).
- **Low stock → reorder in one click** — use the **Reorder** / **Create PR** / **Request Replenishment**
  buttons on the Dashboard and Inventory pages instead of building requests from scratch.
- **Prefer Dark mode?** Settings → Appearance → Theme → **Dark** (or **System** to follow your OS).
- **Export anything important** — inventory snapshots, reports, disposal certificates, and audit logs all
  export to Excel/CSV for filing.
- **Pop-ups** — printing POs and reports opens a new window; allow pop-ups for this site.

---

*Pangasinan Provincial Hospital — Inventory & Procurement Management System. Access is restricted to
authorized hospital staff; contact your system administrator if you cannot sign in or need a role change.*
