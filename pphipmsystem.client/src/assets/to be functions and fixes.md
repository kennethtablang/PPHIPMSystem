# To-Be Functions and Fixes

Candidate features and known fixes for the PPH Inventory & Procurement Management System.
Rewritten 2026-07-03 after the first two delivery batches shipped (FEFO issuance, delivery→batches,
login lockout, rate limiting, Excel exports, global search, supplier metrics, replenishment,
code-splitting, and the smaller fixes). Everything already implemented has been removed;
items marked **(carried)** survive from the previous list, the rest are newly identified.

Effort: **S** (hours) · **M** (days) · **L** (a week or more).

> **Progress (2026-07-03):** the entire order of attack (steps 1–7) is DONE —
> ✅ F1 (deactivation revokes access immediately), ✅ #18 (forced password change),
> ✅ F3 (forwarded headers), ✅ #4 (batch correction), ✅ #10 (approval aging),
> ✅ #9 (partial deliveries), ✅ #1 (bulk item import), ✅ F2 (retention cleanup),
> ✅ #13 (monthly summary emails), ✅ #15 (forecast anomaly alerts), ✅ #16 (live
> dashboard), ✅ #21 (announcement scheduling), ✅ #22 (search keyboard), ✅ #23 (health).
>
> **Batch 3 (post-order-of-attack):** ✅ #6 (void / reverse stock movement — a
> voided movement keeps its ledger row, is flagged, and is neutralised by a
> compensating reversal entry that restores batch quantities and consumption records),
> ✅ #3 (bulk expired disposal + COA disposal certificate export),
> ✅ #2 (cycle-count worksheet → bulk pending adjustments).
> Still open: #5 valuation, #8 dept transfers, #11 attachments, #12 RIS forms,
> #13 budgets, #17 TOTP 2FA, #19 refresh tokens, #20 backup restore UI,
> F4 concurrency tokens, F5 server-side pagination, F6 lint cleanup.

---

## Part 1 — To-Be Functions (new capabilities)

### Inventory & Stock

| # | Function | Why it matters | Effort |
|---|----------|----------------|--------|
| 1 | **Bulk item import from Excel/CSV** — upload a spreadsheet of items (name, code, unit, category, thresholds) with a validation preview before committing | Hospitals migrate from spreadsheets; hand-encoding hundreds of items through the Add Item modal is the single biggest onboarding barrier. ClosedXML is already a dependency, so reading .xlsx costs nothing new | M |
| 3 | **Bulk expired-batch disposal + disposal certificate** — one action disposes all expired batches, producing a signed disposal document (Excel/print) listing lots, quantities, and reasons | Expired batches must be disposed one at a time today; pharmacies dispose in batches monthly and need the certificate for COA audits. `ReportExportService` building blocks make the document cheap | M |
| 4 | **Batch correction** — edit a batch's lot number / expiration date after receiving (audit-logged) | A typo in the delivery modal is currently permanent; wrong expiry dates poison FEFO ordering and expiration warnings | S |
| 5 | **Physical count / cycle-count worksheet** *(carried)* — enter counted quantities for many items at once, generating adjustments in bulk | Real inventory counts cover hundreds of items; the one-at-a-time adjustment flow doesn't scale to a count day | M |
| 6 | **Barcode / QR labels** *(carried)* — printable labels for items and batches; scan to select in movement/issuance forms | Speeds up receiving and issuing dramatically; SearchSelect pickers are ready to accept scanner input (scanners type + Enter) | M |
| 7 | **Inventory valuation** *(carried)* — carry PO unit cost onto batches; report stock value (weighted average) | The hospital cannot answer "what is our stock worth?"; delivery→batch creation just shipped, so the cost hook point now exists | M |
| 8 | **Department stock transfers** *(carried)* — issue stock *to* a department and track department-level balances | All stock lives in one central pool; wards/units cannot be accounted for | L |

### Procurement

| # | Function | Why it matters | Effort |
|---|----------|----------------|--------|
| 9 | **Partial deliveries** *(carried)* — receive a PO across multiple shipments with per-line received quantities; batches per shipment | `ConfirmDeliveryAsync` is still all-or-nothing (`QuantityDelivered = QuantityOrdered`); real deliveries arrive incomplete. The new delivery modal is the natural place for per-line qty inputs | M |
| 10 | **Approval aging / SLA indicators** — highlight requests pending longer than N days (badge in the list + dashboard tile "3 requests waiting > 7 days") | Requests silently stall between approval levels today; `RequestedAt`/`UpdatedAt` timestamps already exist, this is pure presentation | S |
| 11 | **Attachments on procurement requests** — upload quotes, canvass sheets, and supporting documents to a request | Approvers currently decide on justification text alone; government procurement requires canvass documentation | M |
| 12 | **Official form exports (RIS / PR / PO)** *(carried, expanded)* — render Requisition & Issue Slip, Purchase Request, and Purchase Order in the government-prescribed layout via `ReportExportService` | LGU hospitals must file these forms; generating them from system data removes double encoding. The Excel export pipeline shipped, so each form is now one method | M |
| 13 | **Department budget tracking** *(carried)* — budget per department per fiscal year, consumed by PO totals | Standard LGU requirement; enables "remaining budget" checks at approval time | L |

### Reports & Analytics

| # | Function | Why it matters | Effort |
|---|----------|----------------|--------|
| 14 | **Scheduled email reports** *(carried)* — email the monthly consumption/procurement summary to administrators automatically | `EmailService`, the `BackupSchedulerService` pattern, and per-user email preferences all exist; this is composition, not new infrastructure | M |
| 15 | **Forecast anomaly alerts** — when a month's actual consumption deviates sharply from its forecast, notify inventory officers | `DemandForecast.ActualQuantity` vs `ForecastedQuantity` is already recorded per month; a threshold check in the existing sync path surfaces stockout risks and data errors for free | S |
| 16 | **Live dashboard updates** — push stock/procurement changes to the dashboard via SignalR instead of requiring refresh | SignalR hubs (`/hubs/notifications`, `/hubs/forecast`) are already wired; the dashboard is the one page where staleness misleads | S |

### System & Security

| # | Function | Why it matters | Effort |
|---|----------|----------------|--------|
| 17 | **Authenticator-app 2FA (TOTP)** — offer Google/Microsoft Authenticator alongside email codes | 2FA is email-only; if SMTP is down or slow, every 2FA user is locked out of the system. Identity has built-in TOTP support | M |
| 18 | **Force password change on first login** — flag seeded/admin-reset accounts to require a new password at next sign-in | Every seeded account shares `PPHipm@2025!` (`DataSeeder.cs`); admin resets also hand out known passwords. One flag + one redirect closes it | S |
| 19 | **Refresh tokens / silent re-auth** *(carried)* — keep sessions alive past the 8-hour JWT without a hard logout | Tokens die mid-shift (8 h, `Jwt:ExpiryHours`); users lose half-typed forms. Pairs with Fix F1 below | M |
| 20 | **Backup restore & download from UI** *(carried)* — download a backup file; guided admin-only restore flow | Backups that can't be restored from the UI are half a disaster-recovery story | M |
| 21 | **Announcement scheduling** — optional start/end datetime on the system announcement banner | Admins currently must remember to clear "maintenance tonight" banners the morning after | S |
| 22 | **Search polish: Ctrl+K + arrow keys** — keyboard shortcut to focus global search; arrow/Enter navigation in the results dropdown | The search shipped mouse-only; power users live on the keyboard | S |
| 23 | **Health endpoint** — `/health` via `AddHealthChecks` (DB + SMTP reachability) | Gives IT a monitoring hook before this goes to production; ~10 lines | S |

---

## Part 2 — Fixes & Technical Debt (verified in code)

| # | Fix | Where | Severity |
|---|-----|-------|----------|
| F1 | **Deactivated users keep access for up to 8 hours** — JWTs are validated statelessly and nothing re-checks `IsActive` per request, so deactivating (or demoting) an account does not cut off its existing token until expiry. Add a lightweight per-request check (e.g. `OnTokenValidated` event or middleware with a short cache), or a token-version claim | `Program.cs` (JWT bearer setup), `AuthService.cs:209` (8 h expiry) | High |
| F2 | **Notifications and audit logs grow unbounded** — no retention/cleanup anywhere; both tables grow forever and will eventually slow the notification bell and audit queries. Add a retention job on the existing background-scheduler pattern (e.g. notifications 90 days, audit logs archived yearly) | `NotificationService.cs`, `AuditLogService.cs` | Medium |
| F3 | **Rate limiter breaks behind a reverse proxy** — partitions key on `RemoteIpAddress`; deployed behind IIS/nginx every user shares the proxy's IP, so 10 logins/min would throttle the whole hospital. Configure `ForwardedHeaders` before production deployment | `Program.cs` (rate limiter policies) | Medium (deploy blocker) |
| F4 | **Lost updates on concurrent edits** — two admins editing the same item/user/supplier silently overwrite each other (last save wins, no warning). Add a `rowversion` concurrency token to the hot entities and surface a "record was changed" message | `InventoryService.UpdateAsync` and peers | Medium |
| F5 | **Tables load all rows** *(carried)* — pagination is client-side only; audit log and stock movements will grow unbounded. Move the biggest tables to server-side paging (`skip`/`take`) | `AuditLogPage`, `StockMovements` + their endpoints | Medium |
| F6 | **34 ESLint warnings** *(carried)* — mostly `setState`-in-effect patterns; harmless today but they bury any new warning | client-wide (`npm run lint`) | Low |
| F7 | **Global search results are mouse-only** — no arrow-key/Enter selection in the dropdown (see Function #22) | `components/layout/GlobalSearch.jsx` | Low |

---

## Suggested order of attack

1. **F1** (deactivation doesn't revoke access) — the one genuine security hole; small, contained.
2. **#18** (force password change on seeded accounts) + **F3** (forwarded headers) — both are quick and must land before any real deployment.
3. **#4** (batch correction) and **#10** (approval aging) — S-effort, immediately felt by daily users.
4. **#9** (partial deliveries) — completes the delivery→batch story shipped this week.
5. **#1** (bulk item import) — biggest single onboarding win.
6. **F2** (retention job) + **#14** (scheduled email reports) — share the same background-job pattern; build together.
7. **#15, #16, #21, #22, #23** — small quality items to batch into a polish pass.
8. Larger projects (#8 transfers, #13 budgets, #17 TOTP, #19 refresh tokens) as scheduled work.
