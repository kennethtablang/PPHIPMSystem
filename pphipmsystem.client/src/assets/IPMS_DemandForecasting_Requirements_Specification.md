# Inventory and Procurement Management System with Demand Forecasting for Pangasinan Provincial Hospital — System Features and Software Requirements Specification (SRS)

**Institution:** Pangasinan Provincial Hospital, San Carlos City, Pangasinan
**Regulatory Anchor:** Government Procurement Reform Act (RA 9184)
**Quality Framework:** ISO 25010 (six dimensions: functionality, reliability, usability, efficiency, maintainability, portability)
**Technology Stack:** ASP.NET Core Web API, C#, Entity Framework Core, Microsoft SQL Server, React.js (Vite), CSS3, SignalR, Recharts

---

## 1. System Overview

The system is a web-based platform that consolidates hospital supply chain operations — centralized inventory tracking, expiration monitoring, automated reorder alerts, demand forecasting, multi-level procurement approval, supplier management, stock adjustment, smart search, and real-time notifications — into a single role-based system for Pangasinan Provincial Hospital. It replaces fragmented manual ledgers and spreadsheets, shifting supply management from reactive to proactive, data-driven decision-making while supporting RA 9184 compliance through digital audit trails.

---

## 2. User Roles (Actors)

| Role | Description | Primary System Interactions |
|---|---|---|
| **Inventory Officer** | Manages stock records, adjustments, and expiration monitoring | Records stock movements, processes adjustments, monitors reorder/expiration alerts, reviews procurement requests directly for in-stock fulfillment |
| **Procurement Staff** | Processes procurement requests and supplier transactions | Reviews/forwards purchase requests, manages supplier records, generates purchase orders |
| **Department Head** | Initiates procurement requests on behalf of a department | Submits purchase requests, views department stock status via List of Materials, tracks request approval on a dedicated real-time dashboard |
| **Hospital Administrator** | Oversees overall operations and final approvals | Final-level approval authority, views system-wide real-time dashboards and reports, manages users |

---

## 3. Core System Features

| # | Feature / Module | Description |
|---|---|---|
| 1 | **User Authentication & Role-Based Access Control (RBAC)** | Secure, role-differentiated login governing access for Inventory Officers, Procurement Staff, Department Heads, and Hospital Administrators. |
| 2 | **Real-Time Reactive Dashboards** | Live view of stock levels, low-stock alerts, expiring items, and procurement summaries, auto-updating instantly via SignalR without page reloads. |
| 3 | **Automated Reorder Alert Generation** | Notifications triggered when stock levels fall below predefined reorder thresholds. |
| 4 | **Expiration Date Tracking & Background Service** | Automated daily background scanning and proactive alerting of pharmaceutical products and supplies nearing expiration. |
| 5 | **Demand Forecasting (Moving Average & Exponential Smoothing)** | Statistical forecasting based on automatically synced historical consumption data to generate replenishment recommendations up to 12 months ahead. |
| 6 | **Procurement Request & Multi-Level Approval Workflow** | Digital routing of purchase requests through Department Head → Inventory Officer / Procurement Staff → Administrator approval levels. |
| 7 | **List of Materials Catalog** | A comprehensive view for Department Heads to see available hospital items, quantities in stock, and low-stock warnings before requesting. |
| 8 | **Supplier Management** | Centralized registry of accredited suppliers, including contact details, accreditation status, and transaction history. |
| 9 | **Stock Adjustment with Approval Process** | Reconciliation of discrepancies between digital records and physical counts, requiring supervisory approval. |
| 10 | **Recent Transactions Panel** | Quick-review interface displaying recent stock and procurement activity, supporting repeat actions. |
| 11 | **Smart Search and Filtering** | Keyword and multi-criteria search across inventory items, suppliers, and procurement records. |
| 12 | **Real-Time SignalR Notification System** | Instant, role-specific push alerts for approvals, low-stock/expiration conditions, and procurement status updates. |
| 13 | **Audit Trail / Compliance Logging** | System-generated logs of all stock adjustments, procurement submissions, and approval decisions for RA 9184 audit compliance. |
| 14 | **Analytics and Report Generation** | Interactive chart-based consumption, procurement, and forecast accuracy reports with printable PDF export capabilities. |

---

## 4. Functional Requirements (FR)

### 4.1 User Authentication and Access Control

| ID | Requirement |
|---|---|
| FR-1.1 | The system shall allow registered users to log in using a unique username/employee ID and password via JWT authentication. |
| FR-1.2 | The system shall authenticate each user and assign exactly one role: Inventory Officer, Procurement Staff, Department Head, or Hospital Administrator. |
| FR-1.3 | The system shall enforce role-based access control (RBAC), restricting API endpoints, UI modules, and actions according to the authenticated user's role. |
| FR-1.4 | The system shall strictly isolate Department Head data, preventing cross-department data leakage for procurement requests and dashboard metrics. |
| FR-1.5 | The system shall allow administrators to create, update, deactivate, and delete user accounts. |

### 4.2 Real-Time Inventory Dashboard & List of Materials

| ID | Requirement |
|---|---|
| FR-2.1 | The system shall display real-time stock levels for all inventory items across departments/service units. |
| FR-2.2 | The system shall display a consolidated summary of low-stock items, expiring items, and pending procurement requests on the dashboard. |
| FR-2.3 | The dashboards shall be reactive, automatically updating metrics and recent activity tables in real-time via SignalR when relevant background events occur. |
| FR-2.4 | The system shall provide a dedicated "List of Materials" page allowing all roles to view items, real-time available quantities, and low-stock statuses. |

### 4.3 Automated Reorder Alert Generation

| ID | Requirement |
|---|---|
| FR-3.1 | The system shall allow inventory officers to define a reorder threshold (minimum stock level) per inventory item. |
| FR-3.2 | The system shall automatically generate a low-stock alert when an item's quantity on hand falls below its defined reorder threshold. |
| FR-3.3 | The system shall notify Inventory Officers and Hospital Administrators when a reorder alert is triggered. |
| FR-3.4 | The system shall allow a reorder alert to be converted directly into a pre-filled draft procurement request. |

### 4.4 Expiration Date Tracking

| ID | Requirement |
|---|---|
| FR-4.1 | The system shall record the expiration date for each batch/lot of pharmaceutical and medical-surgical items received. |
| FR-4.2 | The system shall run a daily background service to automatically flag items approaching their expiration date within a configurable warning period. |
| FR-4.3 | The system shall prevent notification flooding by logging and de-duplicating daily expiration alerts per batch. |
| FR-4.4 | The system shall allow inventory officers to mark expired items for disposal/write-off, with the action recorded in the audit trail. |

### 4.5 Demand Forecasting

| ID | Requirement |
|---|---|
| FR-5.1 | The system shall automatically sync and aggregate historical consumption data directly from actual stock movement (issuance) records. |
| FR-5.2 | The system shall compute demand forecasts using the Moving Average method over a configurable time window. |
| FR-5.3 | The system shall compute demand forecasts using the Exponential Smoothing method with a configurable smoothing constant. |
| FR-5.4 | The system shall allow users to dynamically select the forecast period length (e.g., 1 to 12 months ahead). |
| FR-5.5 | The system shall display forecasted demand, actual consumption, and suggested reorder quantities (+10% buffer) on a real-time interactive chart. |
| FR-5.6 | The system shall instantly broadcast newly generated forecasts to all connected clients viewing the item via SignalR. |

### 4.6 Procurement Request and Approval Workflow

| ID | Requirement |
|---|---|
| FR-6.1 | The system shall allow Department Heads to create a procurement request specifying item(s), quantity, and justification, without exposing financial costs. |
| FR-6.2 | The system shall allow Inventory Officers to directly review Department Requests to fulfill them immediately if items are available in stock. |
| FR-6.3 | The system shall route each procurement request sequentially through defined approval levels (Department Head → Inventory/Procurement → Administrator). |
| FR-6.4 | The system shall allow each approver to approve, reject, or return-for-revision a procurement request, with mandatory remarks on rejection or return. |
| FR-6.5 | The system shall allow Procurement Staff to generate a purchase order from a fully approved procurement request. |

### 4.7 Supplier Management

| ID | Requirement |
|---|---|
| FR-7.1 | The system shall allow Procurement Staff to register and maintain supplier records, including name, contact information, and accreditation status. |
| FR-7.2 | The system shall maintain a transaction history per supplier, linked to purchase orders and deliveries. |
| FR-7.3 | The system shall allow Procurement Staff to update a supplier's accreditation status. |

### 4.8 Stock Adjustment

| ID | Requirement |
|---|---|
| FR-8.1 | The system shall allow Inventory Officers to submit a stock adjustment request to reconcile discrepancies between recorded and physical counts. |
| FR-8.2 | The system shall require supervisory approval before a stock adjustment is applied to inventory records. |
| FR-8.3 | The system shall record the reason, requester, approver, and timestamp for every stock adjustment. |

### 4.9 Recent Transactions Panel

| ID | Requirement |
|---|---|
| FR-9.1 | The system shall display a chronological list of recent inventory and procurement transactions for the logged-in user's role. |
| FR-9.2 | The system shall allow users to repeat/duplicate a prior transaction (e.g., re-issue a receipt or issuance) from the recent transactions panel. |

### 4.10 Smart Search and Filtering

| ID | Requirement |
|---|---|
| FR-10.1 | The system shall allow users to search inventory items, suppliers, and procurement records by keyword. |
| FR-10.2 | The system shall allow users to filter inventory and procurement records by multiple criteria (e.g., category, department, status, date range). |

### 4.11 Real-Time Notification System

| ID | Requirement |
|---|---|
| FR-11.1 | The system shall use SignalR WebSockets to deliver instant, real-time push notifications across all active client sessions. |
| FR-11.2 | The system shall push alerts for low-stock warnings, expiration warnings, and workflow status changes (e.g., approvals, rejections). |
| FR-11.3 | The system shall live-update the unread-notification indicator and instantly prepend new alerts to the user's notification feed. |
| FR-11.4 | The system shall trigger visual global toast alerts for critical events (e.g., rejections or expirations). |

### 4.12 Audit Trail and Compliance

| ID | Requirement |
|---|---|
| FR-12.1 | The system shall automatically log all stock adjustments, procurement submissions, and approval decisions, including user identity and timestamp. |
| FR-12.2 | The system shall prevent modification or deletion of audit log entries by any user role. |
| FR-12.3 | The system shall allow Hospital Administrators to view and export audit trail records for compliance review under RA 9184. |

### 4.13 Report Generation & Analytics

| ID | Requirement |
|---|---|
| FR-13.1 | The system shall generate interactive, chart-based inventory consumption reports showing total units consumed, peak months, and top items. |
| FR-13.2 | The system shall generate procurement summary reports showing request volumes and status breakdowns. |
| FR-13.3 | The system shall generate demand forecast accuracy reports comparing forecasted versus actual consumption using Mean Absolute Error (MAE) metrics. |
| FR-13.4 | The system shall allow generated reports to be natively exported and printed with specialized print stylesheets for management submission. |

---

## 5. Non-Functional Requirements (NFR)

NFRs are organized according to the **ISO 25010** quality dimensions adopted as the study's acceptability evaluation framework.

### 5.1 Functional Suitability (Functionality)

| ID | Requirement |
|---|---|
| NFR-1.1 | **Completeness:** The system shall implement all functional requirements specified in Section 4 without omission. |
| NFR-1.2 | **Correctness:** Demand forecast computations shall be mathematically accurate to two decimal places. |
| NFR-1.3 | **Appropriateness:** All system functions shall map directly to a documented operational need identified during requirements gathering. |

### 5.2 Reliability

| ID | Requirement |
|---|---|
| NFR-2.1 | **Availability:** The system shall be available during hospital operating hours (e.g., 99% uptime). |
| NFR-2.2 | **Fault Tolerance:** Database transactions shall be atomic and consistent, leveraging EF Core transaction management to prevent partial writes. |
| NFR-2.3 | **Real-Time Resiliency:** The SignalR WebSockets implementation shall automatically attempt reconnection if the network drops. |
| NFR-2.4 | **Alert Reliability:** The background worker for expiration alerts shall execute reliably every 24 hours without duplicate flooding. |

### 5.3 Usability

| ID | Requirement |
|---|---|
| NFR-3.1 | **Learnability:** A first-time user shall be able to complete their primary task within a defined number of steps. |
| NFR-3.2 | **Operability:** Each role shall be presented only with navigation options and dashboard widgets relevant to that role. |
| NFR-3.3 | **User Interface Consistency:** The system shall apply a consistent visual design across all React views. |
| NFR-3.4 | **Responsiveness:** The user interface shall render correctly and remain usable on desktop, tablet, and mobile-sized viewports. |

### 5.4 Performance Efficiency

| ID | Requirement |
|---|---|
| NFR-4.1 | **Time Behavior:** Standard page views shall load within an acceptable response time (≤ 2 seconds) under normal load. |
| NFR-4.2 | **Resource Utilization:** Database queries and forecasting computations shall be optimized (e.g., AsNoTracking, indexed columns). |
| NFR-4.3 | **Capacity:** The system shall support concurrent access by the target user population without significant performance degradation. |

### 5.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-5.1 | **Modularity:** The system shall be implemented using an API-driven architecture, separating the ASP.NET Core backend from the React Vite frontend. |
| NFR-5.2 | **Reusability:** Common UI elements (modals, toast notifications, status badges) shall be implemented as reusable React components. |
| NFR-5.3 | **Modifiability:** Database schema changes shall be managed through Entity Framework Core migrations. |

### 5.6 Portability

| ID | Requirement |
|---|---|
| NFR-6.1 | **Adaptability:** The system shall function correctly on current versions of major web browsers (Chrome, Edge, Firefox, Safari). |
| NFR-6.2 | **Installability:** The system shall be deployable to a standard environment (e.g., IIS, Docker) with documented setup steps. |

### 5.7 Security

| ID | Requirement |
|---|---|
| NFR-7.1 | **Authentication Security:** Passwords shall be securely hashed using BCrypt. |
| NFR-7.2 | **Authorization Enforcement:** Role-based access restrictions shall be strictly enforced on backend API endpoints using JWT claims, not just hidden in the UI. |
| NFR-7.3 | **Data Privacy:** Department Heads shall strictly be prevented from accessing hospital-wide inventory metrics or procurement requests from other departments. |
| NFR-7.4 | **Audit Logging:** Critical actions shall be logged immutably with user identity and timestamp. |

---

## 6. Traceability Note

Each functional module in Section 4 corresponds to one of the **Core System Features** in Section 3, and each NFR category in Section 5 corresponds to one of the six **ISO 25010** acceptability dimensions evaluated through the study's survey instrument (functionality, reliability, usability, efficiency, maintainability, portability), ensuring full traceability from requirements through to evaluation against respondents drawn from Inventory Officers/Procurement Staff, Department Heads, and IT Experts.
