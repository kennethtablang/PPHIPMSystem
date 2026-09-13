# To-Be Functions and Fixes

Feature/fix tracker for the PPH Inventory & Procurement Management System.
Last updated 2026-08-06. Effort: **S** (hours) · **M** (days) · **L** (a week or more).

---

## ✅ Completed

### Security & Authentication
- **Login lockout** — 5 failed passwords/OTPs locks the account 15 minutes; failed 2FA codes count too
- **Immediate access revocation** — deactivating a user kills their JWT within seconds (per-request IsActive check, 60s cache, evicted on deactivate/delete)
- **Forced password change** — seeded accounts, admin-created users, and admin resets must set their own password before entering the app
- **Refresh tokens / silent re-auth** — rotating 7-day tokens; axios silently refreshes on 401 and retries; all tokens revoked on any password change; revoke on sign-out
- **Configurable password policy** — admin-set min length + special-character rule, enforced server-side, live hints on all password forms
- **Auth rate limiting** — per-IP limits on login/2FA/reset (10/min) and email-sending endpoints (3 per 5 min)
- **Forwarded headers** — real client IPs behind a reverse proxy (rate limiting + audit logs)
- **DTO validation hardening** — ranges/lengths/FK checks across all input DTOs; global JSON exception handler

### Inventory Accuracy (end-to-end chain)
- **Bulk item import from Excel** — validation preview (categories, duplicates, limits), template download, skip-and-report
- **Batch lot/expiry correction** — audit-logged edit of receiving typos
- **FEFO issuance** — issuance/disposal consumes soonest-expiring batches
- **Void / reverse movements** — flagged originals + compensating reversal entries; restores batches and consumption records
- **Cycle-count worksheet** — bulk counted quantities → pending adjustments for approval, live variance colouring
- **Bulk expired disposal + COA certificate** — one-action write-off with a signed filing document
- **Inventory valuation** — batch unit costs (auto from PO deliveries) + weighted-average valuation sheet in the snapshot export

### Procurement
- **Partial deliveries** — per-line received quantities across multiple shipments; PO closes only when complete; Partial badge
- **Delivery → batch creation** — lot/expiry captured at delivery; PO stock visible to expiration tracking
- **Approval aging indicators** — "waiting Nd" badges + stalled-requests banner (7d amber / 14d red)
- **One-click replenishment** — Reorder buttons on low-stock items prefill a procurement request with suggested quantities
- **RIS / Purchase Request form exports** — LGU-style Excel forms with signature blocks
- **Supplier performance metrics** — delivered-% and average lead time per supplier
- **PR/PO numbering race fixed** — retry on unique-index collision

### Reports & Documents
- **Excel exports** — consumption, procurement, forecast accuracy, inventory snapshot (stock + batches + valuation), disposal certificate
- **Monthly summary emails** — automatic administrator email on the 1st covering the prior month (toggle in System settings)
- **Forecast anomaly alerts** — notification when actual consumption deviates ≥50% (and ≥10 units) from forecast

### System, UX & Ops
- **Settings suite** — Profile, Security, Preferences, Display, System (admin), About; item defaults; announcement banner with scheduling window
- **Global search** — topbar search across items/suppliers/PRs/POs/users; Ctrl+K, arrow-key navigation
- **SearchSelect combobox** — replaced all 7 item dropdowns; type-to-filter, keyboard nav, viewport flip-up
- **Live dashboard** — SignalR StockChanged refresh on any stock activity
- **Server-side pagination** — audit logs + stock movements (with SQL stat aggregates); rows-per-page preference; fixed the movement Type filter that never worked
- **Optimistic concurrency** — item edits reject stale saves instead of silently overwriting
- **Data retention** — nightly purge of old notifications/audit logs (configurable) and dead refresh tokens
- **Scheduled backups** — daily automatic backups with retention; backup management page
- **Health endpoint** — `/health` (app + DB reachability)
- **Code splitting** — chart pages lazy-loaded (initial bundle 1004→575 kB); lint at zero warnings

---

### Batch 5 (also completed)
- **Refresh tokens / silent re-auth** — rotating 7-day tokens, axios single-flight refresh on 401, revoke-all on password change, revoke on sign-out, nightly cleanup of dead tokens
- **Real database backups** — every run now also writes a SQL `.bak` (`BACKUP DATABASE … COPY_ONLY`) beside the Excel export; download either file, **Verify** runs `RESTORE VERIFYONLY`, and a Restore Guide modal documents the exact recovery steps
- **Authenticator-app 2FA (TOTP)** — QR/manual-key enrolment in Security settings (confirm-with-live-code), login prefers app codes (offline, no SMTP dependency) with email fallback; no schema change (Identity token store)
- **Attachments on procurement requests** — upload/download/delete quotes & canvass docs (10 MB, whitelisted types, random disk names); department heads scoped to their own department's requests (IDOR check), Content-Type derived server-side + nosniff; audit-logged; panel in both request view modals
- **QR labels** — printable label sheets for filtered items (encodes item code) and batches (encodes lot number) with print layout; item codes added to every item picker so a scanner's keyboard input selects the item directly

### Batch 6 (also completed)
- **Department stock transfers — phase 1** — new `DepartmentStock` ledger (unique per department+item);
  issuances can target a department (adds to its balance), returns can draw from one (guarded against
  going negative); voids reverse the department side; movements show →/← department; new Department
  Stock page (department heads locked to their own, others browse any/all)

### Batch 7 (also completed)
- **Bulk stock selection + bulk reorder** — tick-boxes on every inventory row (plus a select-all
  header box with an indeterminate state); a bulk action bar appears with **Reorder Selected**
  (one procurement request covering every ticked item, quantities pre-filled), **Replenish
  Selected**, and **Labels**. Selection survives paging and is pruned automatically when filters
  change so the count can never include a hidden row.
- **Replenish from the inventory list (with expiry capture)** — new `ReplenishModal`: one line per
  item recording lot number, quantity, **expiration date**, and unit cost. Each line is received as
  an `ItemBatch`, so new stock immediately feeds FEFO issuance, expiry alerts, and valuation.
  Reachable per-row (**Replenish**) or in bulk from the action bar.
- **Atomic bulk receive** — `POST /api/itembatches/bulk` validates every line (items, POs) before
  writing, then commits all batch inserts plus the `QuantityOnHand` increases in one
  `SaveChangesAsync`. A rejected line means nothing is saved, so the user can fix and resubmit the
  same receipt without double-counting. Capped at 200 lines; one summary audit entry with the
  per-line breakdown, and the same per-line expiry notifications the single-receive path raises.
- **QR codes for procurement** — QR of the request number on the request view modal and of the PO
  number inside the PO print area (so the printed PO carries a scannable code); **QR Labels** sheets
  for both lists. Scanning types the PR/PO number into global search (Ctrl+K), which already
  resolves both.
- **Motion pass** — shared motion tokens (`--ease`, `--dur-fast/base/slow`); route changes use a
  shorter `pageEnter` rise; buttons gained press/lift feedback and named transition properties
  instead of `transition: all`; table-row hover replaced the `translateY` (which shimmered
  neighbouring borders) with an inset rail; card hover lift; brand-coloured tick boxes; smooth
  scrolling; and OS-level `prefers-reduced-motion` is now honoured alongside the in-app toggle.

### Batch 8 (also completed)
- **Department transfers — phase 2** — ward-level consumption recording. New
  `DepartmentConsumption` movement type (appended to the enum, so existing int-stored rows keep
  their meaning) drawn down via **Record Usage** on the Department Stock page. It reduces the
  ward's balance *only*: central `QuantityOnHand` already fell at issuance, and the issuance
  already wrote the `ConsumptionRecord` that feeds forecasting — counting it again would double
  the forecast input. Voids restore the ward balance and leave central stock alone.
  **Who records:** department heads for their own ward (server-enforced against the `departmentId`
  claim, whatever the body claims), inventory officers and administrators for any. Deliberately a
  separate endpoint (`POST /api/departmentstock/consume`) rather than widening the movements
  endpoint's role list, so department heads can't reach receipts/issuances/disposals.
- **Department Stock sheet in the snapshot export** — fourth sheet listing every ward-held balance
  plus a per-department roll-up, with an explicit note that it does not overlap Stock on Hand.

### Batch 9 (also completed)
- **Department transfers — phase 3** — ward-to-ward handovers. New `DepartmentTransfer` movement
  type (appended to the enum) with a second `ToDepartmentId` on the movement, so one row records
  the whole handover: source balance down, destination balance up. Central `QuantityOnHand`,
  the batches, and the consumption records behind forecasting are all untouched — the units left
  the storeroom at issuance and never come back through it, so hospital-wide totals are identical
  before and after. **Transfer** button on every Department Stock row; the ledger shows
  `Ward A → Ward B`, and a zero central delta now renders unsigned so it can't be misread as a
  receipt. Voiding walks the units back — destination first, so a void fails cleanly if the
  receiving ward has already used the stock.
  **Who transfers:** department heads out of their own ward only (server-enforced against the
  `departmentId` claim); inventory officers and administrators between any two.
- **Department budget tracking** — appropriation per department per fiscal year (calendar year,
  matching the LGU cycle) on a new **Budgets** page: budget, committed, remaining, a utilisation
  bar, and the estimated value of requests still queued. Spend is never stored — it is summed from
  the purchase orders raised against the department's requests, so an amended or voided order can't
  leave a stale figure behind.
  **Where it bites:** the purchase order, not the approval — that is where money is actually
  committed and where real supplier costs (rather than the requester's estimates) are first known.
  An order that would take a department past its budget is rejected with the exact shortfall; the
  new **Enforce department budgets** system setting turns that into a warning instead, and
  administrators are notified on any overrun or at 90% utilisation. Departments with no budget row
  are unbudgeted and never checked. Approvers and PO staff see the remaining balance inline before
  they commit.
  **Who sees it:** administrators set the figures; procurement staff read all; department heads
  read their own only.

- **Fresh-install seeding fixed** — `MockDataSeeder` wrote one `ConsumptionRecord` per issuance, so
  two issuances landing in the same month collided with the unique (item, year, month) index and a
  brand-new database never finished seeding. It now accumulates per month and tops up the existing
  row, exactly as the live issuance path does. Verified by seeding an empty database end to end:
  67 consumption rows, all distinct, totalling the same 986 units as the issuance movements.
  Only ever affected empty databases — existing installs were seeded before the generated month
  ranges started overlapping.

### Batch 10 (also completed)

An audit on 2026-08-06 — client↔server contract check, backup coverage, module completeness — turned
up five gaps, all now closed.

- **Notification types re-synced with the server** — the client's `TYPE_META` map listed
  `AdjustmentRequested/Approved/Rejected`, `StockOut` and `DeliveryConfirmed`, none of which the
  server has ever sent, while the three types it *does* send (`StockAdjustment*`) weren't mapped at
  all. The **Adjustments** filter tab could therefore never match a single notification, and every
  adjustment alert rendered with a grey generic icon and the raw enum name as its label. Map
  corrected, phantom entries dropped, and a new **Other** group catches `General`. Budget alerts got
  their own `BudgetAlert` type (appended to the enum) instead of riding on `General`. A contract
  check now confirms 12 server types, 12 mapped, no phantoms either way.
- **Backup workbook completed** — `DepartmentStocks`, `DepartmentBudgets`, `RequestAttachments` and
  `SystemSettings` were missing from the Excel export, so the readable copy an admin opens (or hands
  to COA) omitted every ward balance and appropriation. The SQL `.bak` was always complete, so
  nothing was ever actually lost. Now 21 sheets; `RefreshTokens` stays out deliberately — they are
  live credentials.
- **"Head of Department" now actually saves** — the Departments page had the input and a display
  line, but no such field existed on the model, DTO, or database, so it was silently dropped on
  every save. Wired end to end (blank stored as null), and the RIS **"Received by"** line now prints
  the head's name instead of a blank rule. "Issued by" stays a rule — the storeroom signs that one.
- **Dead `phoneNumber` state removed** from the Users page form: carried in the blank form and the
  edit prefill, but no input rendered it and no server DTO accepted it.
- **Budget utilisation export** — every other module exported to Excel; budgets had none. New
  **Export** button on the Budgets page produces an appropriation-vs-committed sheet for the chosen
  fiscal year, with a summary block, a per-department table (unbudgeted departments included and
  labelled), and estimated pending requests kept in a separate table so nobody adds the two together.
  Restricted to administrators and procurement staff, matching the page itself.

## 🔲 Still to apply

Nothing outstanding.

### Deployment checklist (before production)
- Change every seeded password (forced-change flag now covers new seeds, but rotate existing dev accounts)
- Restrict `ForwardedHeaders` KnownProxies to the actual reverse proxy
- Point `/health` at the hospital's monitoring
- Configure SMTP credentials and `Jwt:Key`/`Jwt:RefreshDays` via environment, not appsettings
