# Inventory and Procurement Management System with Demand Forecasting for Pangasinan Provincial Hospital — System Features and Software Requirements Specification (SRS)

**Institution:** Pangasinan Provincial Hospital, San Carlos City, Pangasinan
**Regulatory Anchor:** Government Procurement Reform Act (RA 9184)
**Quality Framework:** ISO 25010 (six dimensions: functionality, reliability, usability, efficiency, maintainability, portability)
**Technology Stack:** ASP.NET Core MVC, C#, Entity Framework Core, Microsoft SQL Server, Bootstrap 5, CSS3, JavaScript/jQuery

---

## 1. System Overview

The system is a web-based platform that consolidates hospital supply chain operations — centralized inventory tracking, expiration monitoring, automated reorder alerts, demand forecasting, multi-level procurement approval, supplier management, stock adjustment, smart search, and notifications — into a single role-based system for Pangasinan Provincial Hospital. It replaces fragmented manual ledgers and spreadsheets, shifting supply management from reactive to proactive, data-driven decision-making while supporting RA 9184 compliance through digital audit trails.

---

## 2. User Roles (Actors)

| Role | Description | Primary System Interactions |
|---|---|---|
| **Inventory Officer** | Manages stock records, adjustments, and expiration monitoring | Records stock movements, processes adjustments, monitors reorder/expiration alerts |
| **Procurement Staff** | Processes procurement requests and supplier transactions | Reviews/forwards purchase requests, manages supplier records, generates purchase orders |
| **Department Head** | Initiates procurement requests on behalf of a department | Submits purchase requests, views department stock status, tracks request approval |
| **Hospital Administrator** | Oversees overall operations and final approvals | Final-level approval authority, views system-wide dashboards and reports, manages users |

---

## 3. Core System Features

| # | Feature / Module | Description |
|---|---|---|
| 1 | **User Authentication & Role-Based Access Control (RBAC)** | Secure, role-differentiated login governing access for Inventory Officers, Procurement Staff, Department Heads, and Hospital Administrators. |
| 2 | **Centralized Inventory Dashboard** | Real-time view of stock levels, low-stock alerts, expiring items, and procurement summaries across all departments. |
| 3 | **Automated Reorder Alert Generation** | Notifications triggered when stock levels fall below predefined reorder thresholds. |
| 4 | **Expiration Date Tracking** | Monitoring and proactive alerting of pharmaceutical products and supplies nearing expiration. |
| 5 | **Demand Forecasting (Moving Average & Exponential Smoothing)** | Statistical forecasting based on historical consumption data to generate replenishment recommendations. |
| 6 | **Procurement Request & Multi-Level Approval Workflow** | Digital routing of purchase requests through Department Head → Procurement Staff → Inventory Officer/Administrator approval levels in compliance with RA 9184. |
| 7 | **Supplier Management** | Centralized registry of accredited suppliers, including contact details, accreditation status, and transaction history. |
| 8 | **Stock Adjustment with Approval Process** | Reconciliation of discrepancies between digital records and physical counts, requiring supervisory approval. |
| 9 | **Recent Transactions Panel** | Quick-review interface displaying recent stock and procurement activity, supporting repeat actions. |
| 10 | **Smart Search and Filtering** | Keyword and multi-criteria search across inventory items, suppliers, and procurement records. |
| 11 | **Notification System** | Real-time, role-specific alerts for approvals, low-stock/expiration conditions, and procurement status updates. |
| 12 | **Audit Trail / Compliance Logging** | System-generated logs of all stock adjustments, procurement submissions, and approval decisions for RA 9184 audit compliance. |
| 13 | **Report Generation** | Consumption, procurement, and inventory reports for management decision-making and regulatory submissions. |

---

## 4. Functional Requirements (FR)

### 4.1 User Authentication and Access Control

| ID | Requirement |
|---|---|
| FR-1.1 | The system shall allow registered users to log in using a unique username/employee ID and password. |
| FR-1.2 | The system shall authenticate each user and assign exactly one role: Inventory Officer, Procurement Staff, Department Head, or Hospital Administrator. |
| FR-1.3 | The system shall enforce role-based access control (RBAC), restricting access to modules, views, and actions according to the authenticated user's role. |
| FR-1.4 | The system shall allow administrators to create, update, deactivate, and delete user accounts. |
| FR-1.5 | The system shall provide a password reset/recovery mechanism for registered users. |
| FR-1.6 | The system shall automatically terminate a user session after a defined period of inactivity. |
| FR-1.7 | The system shall record an audit log of all login attempts, including timestamp, user, and success/failure status. |

### 4.2 Centralized Inventory Dashboard

| ID | Requirement |
|---|---|
| FR-2.1 | The system shall display real-time stock levels for all inventory items across departments/service units. |
| FR-2.2 | The system shall display a consolidated summary of low-stock items, expiring items, and pending procurement requests on the dashboard. |
| FR-2.3 | The system shall allow authorized users to drill down from the dashboard to detailed item-level records. |
| FR-2.4 | The system shall allow administrators to view dashboard data filtered by department, item category, or date range. |

### 4.3 Automated Reorder Alert Generation

| ID | Requirement |
|---|---|
| FR-3.1 | The system shall allow inventory officers to define a reorder threshold (minimum stock level) per inventory item. |
| FR-3.2 | The system shall automatically generate a low-stock alert when an item's quantity on hand falls below its defined reorder threshold. |
| FR-3.3 | The system shall notify Inventory Officers and relevant Department Heads when a reorder alert is triggered. |
| FR-3.4 | The system shall allow a reorder alert to be converted directly into a draft procurement request. |

### 4.4 Expiration Date Tracking

| ID | Requirement |
|---|---|
| FR-4.1 | The system shall record the expiration date for each batch/lot of pharmaceutical and medical-surgical items received. |
| FR-4.2 | The system shall automatically flag items approaching their expiration date within a configurable warning period (e.g., 30/60/90 days). |
| FR-4.3 | The system shall notify Inventory Officers of items nearing or past expiration. |
| FR-4.4 | The system shall allow inventory officers to mark expired items for disposal/write-off, with the action recorded in the audit trail. |

### 4.5 Demand Forecasting

| ID | Requirement |
|---|---|
| FR-5.1 | The system shall record historical consumption data (issuance/usage) per inventory item. |
| FR-5.2 | The system shall compute demand forecasts using the Moving Average method over a configurable time window. |
| FR-5.3 | The system shall compute demand forecasts using the Exponential Smoothing method with a configurable smoothing constant. |
| FR-5.4 | The system shall allow users to select which forecasting method (Moving Average or Exponential Smoothing) is applied per item or item category. |
| FR-5.5 | The system shall display forecasted demand alongside current stock levels to support replenishment planning. |
| FR-5.6 | The system shall use forecast output to generate suggested reorder quantities for procurement requests. |

### 4.6 Procurement Request and Approval Workflow

| ID | Requirement |
|---|---|
| FR-6.1 | The system shall allow Department Heads to create a procurement/purchase request specifying item(s), quantity, and justification. |
| FR-6.2 | The system shall route each procurement request sequentially through defined approval levels (Department Head → Procurement Staff → Hospital Administrator/Inventory Officer, as applicable). |
| FR-6.3 | The system shall allow each approver to approve, reject, or return-for-revision a procurement request, with mandatory remarks on rejection or return. |
| FR-6.4 | The system shall display the current approval status and approval history of each procurement request to relevant users. |
| FR-6.5 | The system shall automatically timestamp and log every approval action with the approver's identity. |
| FR-6.6 | The system shall allow Procurement Staff to generate a purchase order from a fully approved procurement request. |
| FR-6.7 | The system shall notify relevant users (requester, next approver) at each stage of the procurement approval workflow. |

### 4.7 Supplier Management

| ID | Requirement |
|---|---|
| FR-7.1 | The system shall allow Procurement Staff to register and maintain supplier records, including name, contact information, and accreditation status. |
| FR-7.2 | The system shall maintain a transaction history per supplier, linked to purchase orders and deliveries. |
| FR-7.3 | The system shall allow Procurement Staff to update a supplier's accreditation status. |
| FR-7.4 | The system shall allow authorized users to view supplier performance data (e.g., delivery records) associated with each supplier. |

### 4.8 Stock Adjustment

| ID | Requirement |
|---|---|
| FR-8.1 | The system shall allow Inventory Officers to submit a stock adjustment request to reconcile discrepancies between recorded and physical counts. |
| FR-8.2 | The system shall require supervisory approval before a stock adjustment is applied to inventory records. |
| FR-8.3 | The system shall record the reason, requester, approver, and timestamp for every stock adjustment. |
| FR-8.4 | The system shall update inventory quantities automatically upon approval of a stock adjustment. |

### 4.9 Recent Transactions Panel

| ID | Requirement |
|---|---|
| FR-9.1 | The system shall display a chronological list of recent inventory and procurement transactions for the logged-in user's role. |
| FR-9.2 | The system shall allow users to repeat/duplicate a prior transaction (e.g., re-issue a similar procurement request) from the recent transactions panel. |

### 4.10 Smart Search and Filtering

| ID | Requirement |
|---|---|
| FR-10.1 | The system shall allow users to search inventory items, suppliers, and procurement records by keyword. |
| FR-10.2 | The system shall allow users to filter inventory and procurement records by multiple criteria (e.g., category, department, status, date range). |
| FR-10.3 | The system shall return search results within the user's authorized data scope based on their role. |

### 4.11 Notification System

| ID | Requirement |
|---|---|
| FR-11.1 | The system shall generate real-time, in-app notifications for low-stock alerts, expiration warnings, and procurement status changes. |
| FR-11.2 | The system shall route notifications to the appropriate role(s) based on the type of event triggered. |
| FR-11.3 | The system shall display an unread-notification indicator/count for each user. |
| FR-11.4 | The system shall allow users to mark notifications as read and view notification history. |

### 4.12 Audit Trail and Compliance

| ID | Requirement |
|---|---|
| FR-12.1 | The system shall automatically log all stock adjustments, procurement submissions, and approval decisions, including user identity and timestamp. |
| FR-12.2 | The system shall prevent modification or deletion of audit log entries by any user role. |
| FR-12.3 | The system shall allow Hospital Administrators to view and export audit trail records for compliance review under RA 9184. |

### 4.13 Report Generation

| ID | Requirement |
|---|---|
| FR-13.1 | The system shall generate inventory consumption reports per item, category, or department for a specified date range. |
| FR-13.2 | The system shall generate procurement summary reports showing request volumes, approval times, and purchase order status. |
| FR-13.3 | The system shall generate demand forecast accuracy reports comparing forecasted versus actual consumption. |
| FR-13.4 | The system shall allow generated reports to be exported in a printable/exportable format (e.g., PDF) for management and regulatory submission. |

---

## 5. Non-Functional Requirements (NFR)

NFRs are organized according to the **ISO 25010** quality dimensions adopted as the study's acceptability evaluation framework: functionality, reliability, usability, efficiency, maintainability, and portability. A dedicated **Security** subsection is included given the system's role in handling procurement records and compliance audit data under RA 9184.

### 5.1 Functional Suitability (Functionality)

| ID | Requirement |
|---|---|
| NFR-1.1 | **Completeness:** The system shall implement all functional requirements specified in Section 4 without omission. |
| NFR-1.2 | **Correctness:** Demand forecast computations (Moving Average and Exponential Smoothing) shall be mathematically accurate to two decimal places. |
| NFR-1.3 | **Appropriateness:** All system functions shall map directly to a documented operational need identified during requirements gathering with hospital stakeholders. |

### 5.2 Reliability

| ID | Requirement |
|---|---|
| NFR-2.1 | **Availability:** The system shall be available during hospital operating hours (e.g., 99% uptime). |
| NFR-2.2 | **Fault Tolerance / Data Integrity:** Database transactions (e.g., stock adjustments, procurement approvals) shall be atomic and consistent, leveraging SQL Server transaction management to prevent partial writes. |
| NFR-2.3 | **Recoverability:** The system database shall be backed up on a scheduled basis (e.g., daily) and recoverable within a defined Recovery Time Objective (RTO). |
| NFR-2.4 | **Alert Reliability:** Low-stock and expiration alerts shall trigger accurately and consistently, without false positives or missed triggers, across extended operation periods. |
| NFR-2.5 | **Referential Integrity:** All relational tables shall enforce primary key/foreign key constraints to prevent orphaned or inconsistent records (e.g., a procurement request cannot exist without a valid department and item reference). |

### 5.3 Usability

| ID | Requirement |
|---|---|
| NFR-3.1 | **Learnability:** A first-time user of any role shall be able to complete their primary task (e.g., submitting a procurement request, recording a stock adjustment) within a defined number of steps without prior training. |
| NFR-3.2 | **Operability:** Each role shall be presented only with navigation options and dashboard widgets relevant to that role. |
| NFR-3.3 | **User Interface Consistency:** The system shall apply a consistent visual design (color scheme, typography, component styling) across all views using Bootstrap 5 and custom CSS3. |
| NFR-3.4 | **Responsiveness:** The user interface shall render correctly and remain usable on desktop, tablet, and mobile-sized viewports. |

### 5.4 Performance Efficiency

| ID | Requirement |
|---|---|
| NFR-4.1 | **Time Behavior:** Standard page views (dashboards, inventory lists) shall load within an acceptable response time (e.g., ≤ 3 seconds) under normal load on standard institutional hardware. |
| NFR-4.2 | **Resource Utilization:** Database queries and forecasting computations shall be optimized (e.g., indexed columns, efficient LINQ/EF Core queries) to minimize server resource consumption. |
| NFR-4.3 | **Capacity:** The system shall support concurrent access by the target user population (Inventory Officers, Procurement Staff, Department Heads, and Hospital Administrators) without significant performance degradation. |

### 5.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-5.1 | **Modularity:** The system shall be implemented using the MVC architectural pattern, with clear separation between Models, Views, and Controllers. |
| NFR-5.2 | **Reusability:** Common UI elements (e.g., notification components, status badges, alert widgets) shall be implemented as reusable partial views/components. |
| NFR-5.3 | **Modifiability:** Database schema changes shall be managed through Entity Framework Core migrations to support traceable, incremental updates. |
| NFR-5.4 | **Testability:** Controller and service-layer logic, including forecasting calculations, shall be structured to support unit testing independent of the UI layer. |

### 5.6 Portability

| ID | Requirement |
|---|---|
| NFR-6.1 | **Adaptability:** The system shall function correctly on current versions of major web browsers (e.g., Chrome, Edge, Firefox). |
| NFR-6.2 | **Installability:** The system shall be deployable to a standard ASP.NET Core-compatible hosting environment (e.g., IIS on Windows Server) with documented setup steps. |
| NFR-6.3 | **Device Compatibility:** The responsive design shall ensure consistent functionality across desktop, laptop, tablet, and mobile devices. |

### 5.7 Security

| ID | Requirement |
|---|---|
| NFR-7.1 | **Authentication Security:** User passwords shall be stored using a secure, salted hashing algorithm (e.g., via ASP.NET Core Identity) — never in plaintext. |
| NFR-7.2 | **Authorization Enforcement:** Role-based access restrictions shall be enforced at the controller/action level, not only hidden in the UI, to prevent unauthorized access via direct URL navigation. |
| NFR-7.3 | **Data Transmission:** All client-server communication shall be encrypted via HTTPS/TLS. |
| NFR-7.4 | **Audit Logging:** Critical actions (procurement approvals, stock adjustments, account management) shall be logged immutably with user identity and timestamp, in support of RA 9184 audit requirements. |
| NFR-7.5 | **Data Privacy Compliance:** Handling of hospital staff and operational data shall comply with the Philippine Data Privacy Act of 2012 (RA 10173). |

---

## 6. Traceability Note

Each functional module in Section 4 corresponds to one of the **Core System Features** in Section 3, and each NFR category in Section 5 corresponds to one of the six **ISO 25010** acceptability dimensions evaluated through the study's survey instrument (functionality, reliability, usability, efficiency, maintainability, portability), ensuring full traceability from requirements through to evaluation against respondents drawn from Inventory Officers/Procurement Staff, Department Heads, and IT Experts.
