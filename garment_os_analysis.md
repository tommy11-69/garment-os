# Garment OS — Complete Product Workflow & Functionality Analysis

> **Scope rules**: This document describes only what is currently implemented in the codebase. No improvements, bug notes, or architectural opinions are included unless needed to accurately describe what a page actually does.

---

## 1. Application Architecture Overview

Garment OS is a mobile-first SPA served as standalone HTML pages.

| Aspect | Detail |
|---|---|
| **Entry point** | `index.html` — auth guard; redirects to `auth/login.html` if no `gos_token` in `localStorage`, otherwise to `pages/dashboard.html` |
| **Navigation** | Bottom nav bar injected into every page by `js/app.js` via `loadComponent()` fetch calls |
| **Routing** | Each module is a separate `.html` file in `pages/`; navigation is `window.location.href` |
| **State** | Per-module store objects in `js/stores/` (e.g. `FinanceStore.js`), subscribe/render pattern |
| **Data layer** | `js/services/api.js` → `js/data/database.js` → backend REST API; token in request headers |
| **UI components** | Reusable `BottomSheet`, `TimelineEvent`, `TextInput`, `SelectInput`, etc. in `js/components/` |
| **Sheets** | All modals use bottom sheets in `#sheets-container`, toggled via `window.openSheet()` / `window.closeSheet()` from `js/utils/sheet.js` |
| **Global utilities** | `window.showToast()`, `window.showConfirmation()`, `window.setLoading()`, `window.openQuickAddCustomer()` — set up by `js/app.js` |

---

## 2. Authentication

### Page: `auth/login.html`

**What it contains:** Username field, Password field, Login button, toast container.

**What it does:**
1. POSTs credentials to `/auth/login`.
2. On success, stores token in `localStorage` as `gos_token` and navigates to `pages/dashboard.html`.
3. On failure, shows error toast.

**Inputs:** Username (text), Password (password)  
**Output:** `gos_token` in `localStorage`; redirect to Dashboard

---

## 3. Page Index

### 3.1 Dashboard (`pages/dashboard.html`)
**Module JS:** `js/dashboard/index.js` · **Store:** `DashboardStore.js`

**Header:** "Dashboard" + greeting subtitle. No FAB.

| Section | Content |
|---|---|
| **KPI Cards** (horizontal scroll) | 4 metric cards via `renderers.metricCard()`: Total Orders, Total Revenue, Production Active, Pending Payments. From `api.getDashboardMetrics()`. |
| **Recent Orders** | Order cards via `renderers.orderCard()`. Display-only on dashboard. |
| **Recent Activity Feed** | Chronological activity events with icon, description, timestamp. From `api.getDashboardActivity()`. |

Dashboard is **read-only** — no user actions.

---

### 3.2 Orders (`pages/orders.html`)
**Module JS:** `js/orders/index.js` · **Store:** `OrderStore.js`

**Header:** "Orders". **FAB:** `add` → navigates to `pages/create-order.html`.

**Controls:**
- **Search** (`#order-search-input`): live client-side filter by order ID, customer name, or status.
- **View toggle** (list/grid icons): switches between `renderers.orderCard()` and `renderers.orderCardGrid()`.
- **Filter button** → `filterSheet`: Status and Date Range dropdowns.

**Order Card tap:**
- Bulk mode active → toggles selection.
- Normal → `window.openOrderDetails(id)` → dynamically injects `orderDetailsSheet` (90vh) with all order fields, status history timeline, and footer buttons: Edit, Duplicate, Delete, Mark as Dispatched.

**Bulk Mode (long-press):** Toolbar: Select All, Archive, Delete (with confirmation), Export CSV (toast only), Print (`window.print()`).

**Sheets:** `filterSheet` (Status + Date Range); `orderDetailsSheet` (dynamic).

---

### 3.3 Create Order (`pages/create-order.html`)
**Module JS:** `js/orders/create.js`

Multi-step wizard. All steps share `coState` object.

| Step | Title | Fields |
|---|---|---|
| 0 | Select Customer | Searchable customer list from API. Tap to select. "Quick Add Customer" link. |
| 1 | Order Details | Name/reference, quantity, unit (pcs/kgs/meters), delivery date, priority (Normal/Urgent/Critical), description. |
| 2 | Items & Materials | Dynamic line items: item name, qty, unit cost/pc. "+ Add Item" appends; delete per item. |
| 3 | Payment Details | Total value, advance amount, payment method (Cash/UPI/Bank/Cheque), payment status (Paid/Partial/Pending). |
| 4 | Review & Confirm | Read-only summary. "Confirm Order" submits. |

**Navigation:** Next/Back buttons; step dots indicator; Next validates current step before advancing.

**Submit:** `api.createOrder(coState)` → success toast + redirect to `orders.html`.

---

### 3.4 Customers (`pages/customers.html`)
**Module JS:** `js/customers/index.js` · **Store:** `CustomerStore.js`

**Header:** "Customers". **FAB:** `person_add` → `addCustomerSheet`.

**Controls:**
- **Search** (`#customer-search-input`): live filter by name, phone, city.
- **Filter** → `filterSheet`: Status (Active/Inactive) and City dropdowns.

**Customer Card tap:** `window.openCustomerDetails(id)` → dynamically injects `customerDetailsSheet` (90vh):
- Header: name, phone, city, status badge.
- Stats: Total Orders, Total Revenue, Avg. Order Value, Outstanding, Last Order.
- Buttons: Call (tel: link), WhatsApp (wa.me link), Edit → `editCustomerSheet`, Delete (with confirmation).

**Bulk Mode (long-press):** Select All, Export CSV (toast), Archive, Delete (with confirmation).

**Add Customer Sheet:** Name (required), Phone, City, Address, GST, Status, Notes. Submit → `api.createCustomer()`.

**Edit Customer Sheet:** Same form pre-filled. Submit → `api.updateCustomer(id, data)`.

---

### 3.5 Finance (`pages/finance.html`)
**Module JS:** `js/finance/index.js` · **Store:** `FinanceStore.js`

**Header:** "Cash Flow" / "Financial Overview". **FAB:** `receipt_long` → `addTransactionSheet`.

**Period Selector (W / M / Y pills):** Switches 7 / 30 / 365 day lookback. Calls `window.finSetPeriod(period)`, re-renders all charts.

**KPI Dashboard (`#finance-dashboard-container`):**

| Card | Metrics |
|---|---|
| Main Balance | Current Balance (large), Income Today, Expenses Today, Net Flow Today |
| This Month | Total Income, Total Expenses |
| Pending | Pending Receivables, Pending Payments |

**Charts (pure SVG engine inline in `finance.html`):**

| Chart | Type | Data |
|---|---|---|
| Revenue vs Expenses | Animated area/line (SVG polyline) | Income vs Expense per day bucket (up to 14 pts). Hover tooltip. |
| Net Cash Flow | Animated vertical bar (div) | 6-month net per month. Latest highlighted. Badge shows latest net. Hover tooltip. |
| Expense Breakdown | Donut (SVG stroke-dasharray) | Expenses by category, up to 8 slices. Tap slice or legend → `categoryBreakdownSheet`. Center shows total. |
| Income Sources | Horizontal progress bars | Income by category, up to 6 sources. Name, %, amount with colored bar. |

**Transaction List:**
- Search (`#transaction-search-input`): live filter via `financeStore.setSearch()`.
- Filter button → `filterSheet`: Type, Status, Payment Method, Date Range.
- Card tap → `window.openTransactionDetails(id)`.

**Transaction Details Sheet** (85vh, dynamic):
- Fields: type, date, title, amount, category, payment method, ref no., status, notes (editable inline; "Save Notes" → `window.saveDetailNotes(id)`).
- Footer: Edit → `editTransactionSheet`, Duplicate, Delete (with confirmation).

**Sub-Entries (expense payment tracking):**  
"Add Payment" toggle (`window.toggleAddAmountForm()`). Fields: Amount, Date, Note, Payment Method. Submit (`window.addExpenseSubEntry(id)`) appends to `subEntries` JSON on the record.

**Category Breakdown Sheet** (88vh, dynamic): All transactions for tapped expense category.

**Add/Edit Transaction Sheets:** Type, Date, Title (req), Amount (req), Category (searchable; options change by Type; "Other" reveals free-text field), Payment Method, Reference No., Status, Notes. Submit → `api.createTransaction()` or `api.updateTransaction(id, data)`.

**Bulk Mode:** Toolbar: Select All, Archive, Delete (confirmation), Export CSV (toast only), Print (`window.print()` after 1s delay).

---

### 3.6 Inventory (`pages/inventory.html`)
**Module JS:** Inline `<script>` (imports `api`, `renderers`, `BottomSheet`, inputs, `bindFormValidation`)

**Header:** "Inventory" + hardcoded "2 Low Stock Alerts" red badge. **FAB:** `add` → `stockInSheet`.

**Controls:**
- Search bar: present but **not wired** to any handler — does not filter the list.
- Filter button: present but **not wired**.
- Category pills (All Items / Fabric / Yarn / Accessories): **not wired**.

**Inventory List (`#inventory-list`):** On `DOMContentLoaded` → `api.getInventory()` → `renderers.inventoryCard()`. No onclick is wired for list cards.

**Sheets:**

| Sheet | Key Fields | Submit Behavior |
|---|---|---|
| `stockInSheet` | Item (select), Qty, Unit, Supplier (select), Purchase Price, Location, Notes | `closeSheet` + `showToast('Stock recorded')` — **no API call** |
| `stockOutSheet` | Item (select), Qty, Current Stock (disabled), Assign To Order (select), Reason | `closeSheet` + toast — **no API call** |
| `adjustStockSheet` | Item (select), System Stock (disabled), Actual Stock, Reason (select), Notes | `closeSheet` + toast — **no API call** |
| `transferStockSheet` | Item (select), Qty, From Location (disabled), To Location | `closeSheet` + toast — **no API call** |
| `itemDetailsSheet` | Current Stock (hardcoded), Location (hardcoded), Stock History timeline (hardcoded) | Footer: opens stockOutSheet / adjustStockSheet / stockInSheet |

> `itemDetailsSheet` header and timeline content are fully hardcoded ("Cotton Jersey 180GSM", "1,250 kgs", "A-12"). Not populated from API.

---

### 3.7 Production (`pages/production.html`)
**Module JS:** `js/production/index.js` · **Store:** `ProductionStore.js`

**Header:** "Production" + badge "Batch #B-8092" + subtitle "Organic Tees • 5k units". JS `renderUI` updates title text and badge from `api.getActiveBatches()[0]` — the workflow stage cards below remain static HTML. **No FAB.**

**Action Buttons:** Log Expense → `logExpenseSheet`; Log Material → `logConsumptionSheet`.

**Overall Progress bar:** Hardcoded 65%. Text "Expected completion on Oct 22". Not dynamic.

**Workflow Stages (static HTML):**

| Stage | Status |
|---|---|
| Knitting | 100% · Completed Oct 15 · Arjun Mills |
| Dyeing & Compacting | 100% · Completed Oct 17 · ColorVat Dyeing |
| Cutting | 100% · Completed Yesterday |
| Printing / Embroidery | 45% In Progress · "Update" → `updateProgressSheet` |
| Stitching | 0% · Scheduled Oct 20 |
| Quality Check | (no %) |
| Packing & Dispatch | (no %) |

**Sheets (from `js/production/templates.js`):**
- `updateProgressSheet`: Progress + notes.
- `logExpenseSheet`: Expense fields. Validated by `bindFormValidation`.
- `logConsumptionSheet`: Material/qty/unit fields. Validated by `bindFormValidation`.

---

### 3.8 Quotations (`pages/quotations.html`)
**Module JS:** `js/quotations/index.js`

**Header:** "Quotations" / "Create and manage client sales proposals". **FAB:** `add` → `window.openCreateQuotationSheet()`.

**Controls:**
- Search (`#quotations-search-input`): filters by `customerName` or `id`.
- Status tabs (Drafts / Sent / Accepted): `window.setQuotationFilter(status)`. One tab active at a time.

**Quotation List:** Rendered by `getQuotationsHTML(filtered)`. Card tap → `window.openQuotationDetails(id)`.

**Create/Edit Sheet (`createQuotationSheet`):**
1. Customer selector (`#quote-customer-select`) — from `api.getCustomers()`. Selecting "Create New Customer" → `window.openQuickAddCustomer()`, refreshes list.
2. Column toggles (checkboxes): Show Fabric & Processing, Show Colour, Include 5% GST Tax. Show/hide table columns; recalculate totals.
3. Item entry: Name (req), Fabric (optional), Colour (optional), Qty (req), Rate/pc (req). "+ Add Item" → `window.addQuotationItem()`.
4. Items table (`#quote-items-tbody`): S.No, Name, optional cols, Qty, Price/pc, Tax/pc (if enabled), Total, delete. Updates live.
5. Totals: Subtotal, Tax (5% of rate × qty), Grand Total — updated on each add/remove.
6. Notes textarea.
7. Save → `window.saveQuotationForm()` → `api.saveQuotation(data)`. Validates customer selected and at least one item.

**Quotation Details Sheet (`quotationDetailsSheet`):** Rendered by `getQuotationDetailsContentHTML(q)`. Footer: Edit, Change Status (Draft → Sent → Accepted), Print, Delete (confirmation).

**Print (`window.printQuotation(id)`):** Opens new browser window with A4 proforma invoice. Hardcoded company: "Udhayaa Textiles", Erode Tamil Nadu, phone, email, Indian Overseas Bank details, UPI ID. Customer details from `api.getCustomer()`. HSN hardcoded `6109`. Tax split as CGST 2.5% + SGST 2.5%. Grand total in words (Indian numbering). `window.print()` fires automatically after 500ms.

---

### 3.9 Cost Calculator (`pages/calculator.html`)
**Module JS:** Inline `<script>` in HTML.

**Header:** "Costing" / "Profit/Cost Calculator". "Saved Costings" button → `costings.html`.

**Draft restore:** On load reads `sessionStorage.getItem('gos_calc_v2_draft')` and restores all field values.

**Auto-print:** URL `?action=print` → auto-triggers `window.print()` after draft restore.

**Garment Type chips:** T-Shirt, Polo, Hoodie, Jacket, Shorts. Active chip highlighted. Metadata only — does not change cost fields.

**Collapsible sections:**

| Section | Key Fields | Auto-calculation |
|---|---|---|
| Garment & Specs | Client/Style Name, Total Qty (pcs), Pcs per Kg | Total Fabric (kg) = Qty ÷ Pcs/Kg shown in info bar |
| Fabric | Price/kg, Wastage %, Cost/pc (AUTO), Total Cost (AUTO) | Cost/pc = Price/kg ÷ Pcs/kg × (1 + Wastage%). Override either auto field → back-calculates the other. |
| Making / CMT | Mode toggle: Combined (CMT/pc + Total) or Separate (Cutting, Fusing, Wages, Packing — each /pc + Total) | /pc × Qty = Total; Total ÷ Qty = /pc (bidirectional sync) |
| Printing & Sublimation | Printing/pc + Total, Sublimation/pc + Total | Same sync pattern |
| Accessories & Pattern | Acc 1, Acc 2, Acc 3, Pattern (all order lump sums) | Per-pc = lump sum ÷ Qty |
| Allowances & Overheads | Allowances/pc + Total, Overheads/pc + Total | Sync pattern |
| Selling Price & Profit | SP/pc + Total, Target Margin % | Profit/pc = SP − CP. Margin % = (Profit/CP) × 100. Setting one auto-fills the other. |

**Result Card (sticky bottom):** CP/pc, SP/pc, Profit/pc, Profit %, Total Order Profit, cost breakdown bar (colored segments: Fabric, CMT, Printing, Allowances, Accessories).

**Bottom buttons:** Save → `api.saveCosting(formState)`; Print → `window.print()`; New → resets all fields.

**Currency toggle (₹ / $):** Changes symbol prefix only; no conversion.

---

### 3.10 Saved Costings (`pages/costings.html`)
**Module JS:** `js/costings/index.js`

**Header:** "Costings" / "Your saved calculators". Plus button → `calculator.html`.

**States:** Loading (shimmer), Empty ("No Costings Saved" + Create button), List.

**Costing Card:** Client name, style ref, date, Print icon, CP/pc, SP/pc, Margin % (green/red).

**Tap card → `window.openCosting(id)`** → dynamic bottom sheet (88vh):
- Header: client, style ref, date, status. Buttons: Print, Delete, Close (X).
- Scrollable body: **Order Summary** (CP, SP, Profit/pc, Total Profit in 2×2 grid) + cards for each non-zero cost component (Fabric, CMT, Printing & Sublimation, Allowances & Overheads, Accessories & Pattern) + **Cost Breakdown** proportional horizontal bar.
- Footer: Close, Print / PDF, Edit.

**Print:** Stores `gos_calc_v2_draft` in `sessionStorage` with `autoPrint: true` → navigates to `calculator.html?action=print`.

**Edit:** Stores `gos_calc_v2_draft` (no autoPrint) → navigates to `calculator.html` where draft restores.

**Delete:** `confirm()` browser dialog → `api.deleteCosting(id)` → reloads list.

---

### 3.11 Dispatch (`pages/dispatch.html`)
**Module JS:** `js/dispatch/index.js` · **Store:** `DispatchStore.js`

**Header:** "Dispatch" / "3 Shipments Today" (hardcoded). **FAB:** `local_shipping` → `dispatchOrderSheet`.

**Status tabs:** In Transit / Ready / Delivered. Tab click → `dispatchStore.setFilter(tabText)` → re-renders list.

**Shipment List (`#dispatch-list`):** On load → `dispatchStore.loadShipments()` → `api.getShipments()` → `renderers.shipmentCard()`.

> HTML contains two hardcoded static sample cards ("Chennai Silks" / "Arvind Fashions") positioned outside `#dispatch-list` — they always appear below the dynamic list.

**Hardcoded static card buttons:** "Track Shipment" (no handler), "Print Labels" (no handler), "Mark Dispatched" → opens `dispatchOrderSheet`.

**`dispatchOrderSheet`:** Fields from `getDispatchOrderSheetHTML()`; submit defined in template HTML.

---

### 3.12 Reports (`pages/reports.html`)
**Module JS:** None.

**Header:** "Reports" / "Q4 2026 Analytics". Download button — no handler.

**Category tabs** (Sales / Production / Inventory): no handlers; visual only.

**Revenue Chart:** Static CSS bar chart (6 hardcoded bars, Jun–Nov). Hover via CSS.

**Revenue by Client:** Static CSS `conic-gradient` donut. Chennai Silks 45%, Arvind Fashions 30%, Others 25%.

**Material Variance Report:** Two static HTML items with hardcoded estimated vs actual values and hardcoded progress bars.

**Export Options:** "Export as PDF" and "Export as CSV" buttons — **no handlers**.

> Reports is entirely static. No data is fetched. No button is functional.

---

### 3.13 More (`pages/more.html`)
**Module JS:** None.

**Header:** "More".

**Primary menu:**

| Item | Destination |
|---|---|
| Customers | `customers.html` |
| Inventory | `inventory.html` |
| Dispatch | `dispatch.html` |
| Production | `production.html` |
| Reports | `reports.html` |

**Secondary menu:** Settings → `settings.html`; Help & Support → `#` (no action).

**Log Out:** `localStorage.removeItem('gos_token')` + redirect to `auth/login.html`.

---

### 3.14 Settings (`pages/settings.html`)
**Module JS:** `js/settings/index.js`

**Custom header (not shared topbar):** Back button (`history.back()`), title "Account Settings".

**Form: "Update Credentials"**

| Field | ID | Required |
|---|---|---|
| New Username | `#new-username` | No |
| New Password | `#new-password` | No |
| Confirm New Password | `#confirm-password` | Required if password set |

**Validation:** Both empty → error toast. Passwords don't match → inline error message.

**Submit:** `PUT /auth/credentials` with non-empty fields only.
- Password changed → success toast + `localStorage.removeItem('gos_token')` + redirect to login after 1.5s.
- Username only changed → success toast, re-enables button, clears field.

---

## 4. Bottom Navigation

Injected by `js/app.js` into every page. 5 tabs:

| Tab | Icon | Page |
|---|---|---|
| Dashboard | `home` | `dashboard.html` |
| Orders | `receipt_long` | `orders.html` |
| Finance | `account_balance_wallet` | `finance.html` |
| Costing | `calculate` | `calculator.html` |
| More | `more_horiz` | `more.html` |

Active tab highlighted by current page URL match.

---

## 5. Global UI Patterns

### Bottom Sheets
- Component: `BottomSheet(options)` in `js/components/index.js`.
- `window.openSheet(id)` / `window.closeSheet(id)` in `js/utils/sheet.js`.
- All sheets: drag handle, semi-transparent overlay (closes on tap), slide-up animation.
- `isForm: true` → scrollable content + sticky footer zone.
- Default height: `90vh` (overridable).

### Toasts
- `window.showToast(message, type)` — types: `'success'`, `'error'`, `'info'`.
- Rendered into `#toast-container` at page top. Auto-dismiss.

### Confirmation Dialogs
- `window.showConfirmation({ title, message, confirmText, onConfirm })` — modal overlay with Cancel and Confirm.

### Loading State
- `window.setLoading(containerId)` — replaces container innerHTML with skeleton/shimmer.

### Quick Add Customer
- `window.openQuickAddCustomer(callback)` — inline modal for fast customer creation.
- On success, passes new customer to `callback`.
- Used by: Create Order wizard (step 0), Quotations create sheet.

---

## 6. Data Collections

| Collection | Used by |
|---|---|
| `customers` | Customers, Orders (create), Quotations, Dashboard |
| `orders` | Orders, Dashboard, Customer stats enrichment |
| `inventory` | Inventory |
| `transactions` | Finance |
| `batches` | Production |
| `costings` | Calculator (save), Costings (list/detail) |
| `quotations` | Quotations |
| `shipments` | Dispatch |

---

## 7. Order Status Lifecycle (from `api.js`)

```
Draft → Quotation Sent → Awaiting Approval → Approved → Material Reserved
→ Production Assigned → Knitting → Dyeing → Compacting → Cutting
→ Printing → Embroidery → Stitching → Quality Check → Packing
→ Dispatch Ready → Dispatched → Delivered → Closed → Archived
```

---

## 8. Page Inventory Summary

| Page file | Title | Module JS | FAB | Data-driven |
|---|---|---|---|---|
| `auth/login.html` | Login | Inline | No | Yes |
| `pages/dashboard.html` | Dashboard | `js/dashboard/index.js` | No | Yes |
| `pages/orders.html` | Orders | `js/orders/index.js` | Yes (→ create-order) | Yes |
| `pages/create-order.html` | Create Order | `js/orders/create.js` | No | Yes |
| `pages/customers.html` | Customers | `js/customers/index.js` | Yes | Yes |
| `pages/finance.html` | Cash Flow | `js/finance/index.js` | Yes | Yes |
| `pages/inventory.html` | Inventory | Inline | Yes | Partial (list yes; sheet submits no) |
| `pages/production.html` | Production | `js/production/index.js` | No | Partial (timeline static) |
| `pages/quotations.html` | Quotations | `js/quotations/index.js` | Yes | Yes |
| `pages/calculator.html` | Costing | Inline | No | Yes |
| `pages/costings.html` | Costings | `js/costings/index.js` | No | Yes |
| `pages/dispatch.html` | Dispatch | `js/dispatch/index.js` | Yes | Partial (some static HTML) |
| `pages/reports.html` | Reports | None | No | No (fully static) |
| `pages/more.html` | More | None | No | N/A (nav only) |
| `pages/settings.html` | Account Settings | `js/settings/index.js` | No | Yes |
