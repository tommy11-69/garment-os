# GARMENT OS — INFRASTRUCTURE & DEPLOYMENT ANALYSIS

---

## 1. Current Deployment

### Platform & Service

Garment OS is deployed as a **Cloudflare Worker with Static Assets** (`wrangler deploy`).

This is **not** Cloudflare Pages. It is a **Cloudflare Worker** (Workers platform) that serves both:
1. Static frontend assets (HTML, CSS, JS, images) via the `ASSETS` binding
2. An API backend running inside the same Worker process via `/api/*` routes

The Worker entry point is `backend/worker.js`. Static assets are uploaded from the project root (filtered by `.assetsignore`) and served via the `env.ASSETS.fetch(request)` fallback inside the Worker.

### `wrangler.jsonc` Configuration

```jsonc
{
  "name": "garment-os",
  "main": "backend/worker.js",
  "compatibility_date": "2024-11-01",
  "assets": {
    "directory": "./",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "garment-os-db",
      "database_id": "a307df89-71b4-4eed-a45e-54fecb72e614"
    }
  ]
}
```

### What Gets Deployed

| Deployed Component | Description |
|---|---|
| Worker script | `backend/worker.js` — compiled and uploaded to Cloudflare's edge network |
| Static assets | All files in `./` **except** those listed in `.assetsignore` (excludes `node_modules/`, `backend/`, `.git/`, `.wrangler/`, env files, config files) |
| D1 Database binding | `DB` binding wired to existing Cloudflare D1 database `garment-os-db` with ID `a307df89-71b4-4eed-a45e-54fecb72e614` |

### What `.assetsignore` Excludes from Upload

```
node_modules/
backend/
.git/
.wrangler/
.env*
.dev.vars*
package.json
package-lock.json
wrangler.jsonc
DEPLOYMENT.md
DESIGN.md
```

The `backend/` directory (containing `worker.js`, `schema.sql`, `seed.sql`, Express server, etc.) is **not uploaded** as a static asset — `worker.js` is compiled and uploaded as the Worker script entry point only.

### Build Step

**There is no build step.** No bundler (Webpack, Vite, esbuild, etc.) is configured. `wrangler deploy` directly:
1. Takes `backend/worker.js` as the Worker entry point
2. Uploads static files from `./` (filtered by `.assetsignore`)
3. Binds the existing D1 database to `env.DB`

### Deployment Method

Manual. The deployment command is:
```
npx wrangler deploy
```

Defined in `package.json` as:
```json
"deploy": "wrangler deploy"
```

### CI/CD

No CI/CD pipeline found. No `.github/workflows/`, `.gitlab-ci.yml`, or equivalent files exist in the repository. Deployment is manual from a developer's machine.

### Development Environments

| Environment | How it runs |
|---|---|
| **Local (Worker emulation)** | `npm run dev:worker` → `wrangler dev` — runs Miniflare locally on port 8787, emulates D1 via a local SQLite file in `.wrangler/state/v3/d1/` |
| **Local (Express + MongoDB)** | `npm run dev:backend` or `npm run start` → `node backend/server.js` — runs Express on port 5000, connects to MongoDB via `MONGODB_URI` in `.env` |
| **Production** | `npx wrangler deploy` → Cloudflare Worker on `*.workers.dev` or custom domain |

### Deployment Chain

```
Developer machine
       ↓
  Source code in Git repo
       ↓
  (No build step)
       ↓
  npx wrangler deploy
       ↓
  Cloudflare CLI authenticates to Cloudflare account
       ↓
  Worker script (backend/worker.js) uploaded to Cloudflare Workers
  Static assets (.html, .css, .js, /assets) uploaded to Cloudflare
       ↓
  Worker runs at: garment-os.*.workers.dev (or custom domain)
  D1 database "garment-os-db" already exists in Cloudflare account
       ↓
  Production Application accessible
```

### External Services

| Service | Role | Required for production? |
|---|---|---|
| Cloudflare Workers | Hosts and runs the Worker + serves static assets | Yes |
| Cloudflare D1 | Primary production database | Yes |
| MongoDB Atlas | Legacy/alternative local dev database only | No (for Worker deployment) |

---

## 2. Current Database / Data Storage

### Production Database

**Cloudflare D1** — a managed, serverless SQLite-compatible database hosted by Cloudflare.

| Property | Value |
|---|---|
| Database name | `garment-os-db` |
| Database ID | `a307df89-71b4-4eed-a45e-54fecb72e614` |
| Engine | SQLite (via D1 API) |
| Hosted by | Cloudflare (co-located with the Worker) |
| Access method | `env.DB.prepare(sql).bind(...).run()` / `.first()` / `.all()` — D1 binding inside Worker |
| Location | Cloudflare's infrastructure — not on the developer's machine |

### Local Development Database (Wrangler dev only)

When `wrangler dev` is run locally, D1 is emulated using a **local SQLite file** at:
```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
```
This is a local file on the developer's machine, completely separate from the production D1 database.

### Legacy Alternative: MongoDB Atlas / Local MongoDB

The project also has a full Express + Mongoose backend (`backend/app.js`, `backend/server.js`, Mongoose models) that connects to MongoDB. This path is used only when running `npm run start` (Express server on port 5000). This path is **not used by the Cloudflare Worker** and is **not connected to production**.

- `backend/app.js`: Express app with Mongoose models
- `backend/database/connection.js`: MongoDB connection setup
- `MONGODB_URI` in `.dev.vars`: Contains a real MongoDB Atlas connection string (`mongodb+srv://garment_admin:...@garmentos.x5ckuow.mongodb.net/`)
- `backend/scripts/seed.js`: Seeds MongoDB from `js/data/mockData.js`

The `.dev.vars` file contains a **live MongoDB Atlas connection string with actual credentials** (username: `garment_admin`).

### Schema

Defined in `backend/schema.sql`. Tables:

| Table | Key fields |
|---|---|
| `customers` | id, name, company, phone, gst, status, city, address, etc. |
| `orders` | id, customerId, status, qty, value, timeline (JSON), tasks (JSON), stageData (JSON), etc. |
| `inventory` | id, name, sku, quantity, unit, status |
| `batches` | id, orderId, phase, progress, expenses (JSON), consumptions (JSON) |
| `transactions` | id, type, amount, date, category, paymentMethod, subEntries, etc. |
| `costings` | id, clientId, styleRef, totalUnitCost, retailPrice, materials (JSON), uData (JSON) |
| `shipments` | id, customerName, invoiceNo, status, courier, trackingNo |
| `quotations` | id, customerId, customerName, status, items (JSON), totalAmount |
| `users` | id, username, password_hash |
| `sessions` | token, userId, expiresAt |

### JSON Columns

Certain columns store structured data as JSON strings in D1 (SQLite TEXT):
- `orders`: `sizes`, `colours`, `timeline`, `tasks`, `expenses`, `activityLog`, `stageData`, `products`
- `batches`: `expenses`, `consumptions`
- `costings`: `materials`, `uData`
- `quotations`: `items`

The Worker's `hydrateRow()` and `dehydrateData()` functions handle serialization/deserialization on every read/write.

### Seed Data

`backend/seed.sql` contains `INSERT OR IGNORE` statements for:
- 2 customers (Priya Rajan / Chennai Silks, Karthik Natarajan / Arvind Fashions)
- 1 costing (SS24-TS-01)
- 1 order (ORD-992)
- 2 inventory items
- 1 batch (B-8092)
- 1 user (`u-admin` with SHA-256 hashed password)

These are the starting data records for a fresh D1 database.

### Persistence Answers

| Question | Answer |
|---|---|
| Is there an actual database? | **Yes** — Cloudflare D1 (SQLite) in production |
| Is data mock data? | No. The seed SQL provides initial records; user-created data is real |
| Is data stored in browser memory? | No |
| Is data stored in localStorage? | Only the session token (`gos_token`) is stored in localStorage |
| Does refreshing the browser preserve changes? | **Yes** — data is in D1, not the browser |
| Does closing the browser preserve changes? | **Yes** |
| Does another device see the same data? | **Yes** — D1 is server-side |
| Does another browser see the same data? | **Yes** |
| Does another user see the same data? | **Yes** — there is one shared D1 database; no per-user data isolation at the row level |
| Does deployment (redeployment) reset the data? | **No** — D1 is independent of the Worker deployment |
| Can data disappear when browser storage is cleared? | No (only the token is lost, forcing re-login) |
| Is there any persistence outside the user's browser? | **Yes** — Cloudflare D1 |

---

## 3. Entity Data Lifecycle

### Customer

**CREATE**
- UI: `addCustomerSheet` form on `customers.html`
- Function: `api.saveCustomer(customerData)` in `js/services/api.js`
- Path: `db.insert('customers', data)` → `_fetchAPI('/customers', POST)` → Worker `POST /api/customers` → `INSERT INTO customers`
- Storage: Cloudflare D1 `customers` table
- Persistence: Permanent (until deleted)

**READ**
- UI: `customers.html` list, customer detail sheet
- Function: `api.getCustomers()` → `db.getCollection('customers')` → `GET /api/customers` → `SELECT * FROM customers ORDER BY createdAt DESC`
- Single: `api.getCustomer(id)` → `db.getById('customers', id)` → `GET /api/customers/:id` → `SELECT * FROM customers WHERE id = ?`
- Stats enrichment (`totalOrders`, `totalRevenue`, etc.) is computed client-side in `api._enrichCustomerStats()` by cross-referencing the `orders` collection — not stored in D1

**UPDATE**
- Function: `api.updateCustomer(id, data)` → `db.update('customers', id, data)` → `PUT /api/customers/:id` → `UPDATE customers SET ... WHERE id = ?`
- Storage: Updated in D1

**DELETE**
- Function: `api.deleteCustomer(id)` → `db.delete('customers', id)` → `DELETE /api/customers/:id` → `DELETE FROM customers WHERE id = ?`
- Hard delete — no soft delete or archive flag, row is permanently removed

**ARCHIVE**
- Function: `api.archiveCustomer(id)` → `api.updateCustomer(id, { status: 'Archived', ... })`
- Implemented as a status field update — row remains in D1 with `status = 'Archived'`
- Soft archive via status field

**RESTORE**
- Function: `api.restoreCustomer(id)` → `api.updateCustomer(id, { status: 'Active', ... })`
- Sets status back to 'Active' — row already in D1

**DUPLICATE**
- Function: `api.duplicateCustomer(id)` → fetches original → creates new record with new `id`, name appended with "(Copy)" → `db.insert('customers', duplicate)`
- New row inserted in D1

---

### Order

**CREATE**
- UI: `create-order.html` 5-step wizard → "Confirm Order" button
- Function: `api.createOrder(coState)` (in `js/orders/create.js`) → `api.saveOrder(orderData)` → `db.insert('orders', newOrder)` → `POST /api/orders` → `INSERT INTO orders`
- Auto-fields set by Worker: `createdAt`, `updatedAt`, `progressPercentage`, `progressLabel`, `progressColor` (via `recalculateOrderProgress()` in `database.js`)
- Storage: Cloudflare D1 `orders` table

**READ**
- `api.getOrders()` → `db.getCollection('orders')` → `GET /api/orders`
- `db.getById('orders', id)` → `GET /api/orders/:id`

**UPDATE**
- `api.updateOrder(orderId, updates)` → `db.update('orders', orderId, updates)` → `PUT /api/orders/:id`
- Progress recalculated by `database.js` `recalculateOrderProgress()` on every update

**DELETE**
- `api.deleteOrder(orderId)` → `db.delete('orders', orderId)` → `DELETE FROM orders WHERE id = ?`
- Hard delete

**ARCHIVE**
- `api.archiveOrder(orderId)` → sets `status = 'Archived'` + prepends to `timeline` JSON array → `db.update()`
- Soft archive via status field

**STATUS UPDATES**
- `api.updateOrderStatus(orderId, newStatus)` → updates status + appends to `timeline` array + auto-generates tasks based on new status → `db.update()`
- Timeline is stored as a JSON string in the `timeline` TEXT column in D1

**DUPLICATE**
- `api.duplicateOrder(orderId)` → fetches original → new `id`, status reset to "Draft", incurredCost reset to 0 → `db.insert()`

---

### Costing

**CREATE**
- UI: `calculator.html` "Save" button
- Function: `api.saveCosting(formState)` → `db.insert('costings', data)` → `POST /api/costings`
- The full calculator state (`uData` JSON) is stored alongside summary fields
- Storage: D1 `costings` table

**READ**
- `api.getCostings()` → `GET /api/costings` → list for `costings.html`
- `api.getCostingById(id)` → `GET /api/costings/:id` → for detail sheet

**UPDATE**
- Edit path: `costings.html` "Edit" → stores state in `sessionStorage` as `gos_calc_v2_draft` → navigates to `calculator.html` → user modifies → "Save" → if draft had `id`, calls `api.saveCosting({ id, ...data })` which routes to `db.update('costings', id, data)` → `PUT /api/costings/:id`

**DELETE**
- `api.deleteCosting(id)` → `db.delete('costings', id)` → `DELETE FROM costings WHERE id = ?`
- Hard delete

**ARCHIVE** — Not implemented for costings

---

### Finance Transaction

**CREATE**
- UI: `addTransactionSheet` on `finance.html`
- Function: `api.createTransaction(data)` → `db.insert('transactions', data)` → `POST /api/transactions`
- Storage: D1 `transactions` table

**READ**
- `api.getTransactions()` → `GET /api/transactions`

**UPDATE**
- `api.updateTransaction(id, data)` → `db.update('transactions', id, data)` → `PUT /api/transactions/:id`
- Inline notes edit: `window.saveDetailNotes(id)` → same update path

**SUB-ENTRIES**
- `window.addExpenseSubEntry(id)` → fetches transaction → appends to `subEntries` TEXT field → `db.update()`
- `subEntries` stored as JSON string in D1

**ARCHIVE**
- `api.archiveTransaction(ids)` → sets `status = 'Archived'` for each → `db.update()` calls per ID

**DUPLICATE**
- `api.duplicateTransaction(id)` → fetches original → creates copy with new `id` → `db.insert()`

**DELETE**
- `db.delete('transactions', id)` → hard delete

---

### Production (Batch)

**CREATE**
- No UI for creating batches in the current implementation — batches appear to be created via seed data or external means

**READ**
- `api.getActiveBatches()` → `db.getCollection('batches')` → `GET /api/batches`

**UPDATE**
- Log Expense / Log Consumption sheets in `production.html` have `logExpenseSheet` and `logConsumptionSheet` — submit handlers defined in `js/production/templates.js` (not fully inspected, but the D1 write path would be via `PUT /api/batches/:id` updating the `expenses` or `consumptions` JSON arrays)

**DELETE / ARCHIVE** — Not implemented in current UI

---

## 4. Data Flow Architecture

The architecture is:

```
UI (Browser)
    ↓
js/services/api.js  (frontend service layer — business logic, data transformation)
    ↓
js/data/database.js  (frontend data access layer — constructs HTTP requests, reads gos_token from localStorage)
    ↓
fetch() → HTTP request to /api/*  (Bearer token in Authorization header)
    ↓
Cloudflare Worker (backend/worker.js)  (auth middleware validates token against D1 sessions table)
    ↓
env.DB.prepare(sql)  (D1 binding — parameterized SQL)
    ↓
Cloudflare D1 (SQLite database — garment-os-db)
    ↓
Response → JSON
    ↓
api.js processes response
    ↓
UI renders
```

**Concrete example — User creates a customer:**

```
User fills addCustomerSheet form → clicks Save
    ↓
window.saveCustomer() (js/customers/index.js)
    ↓
api.saveCustomer(customerData) (js/services/api.js)
    → validates no duplicate (by name/phone/GST) via api.getCustomers()
    → constructs newCustomer object with generated id
    ↓
db.insert('customers', newCustomer) (js/data/database.js)
    → POST /api/customers with JSON body + Authorization: Bearer <token>
    ↓
Worker fetch handler (backend/worker.js)
    → validates Bearer token against sessions table in D1
    → runs: INSERT INTO customers (...) VALUES (...)
    → runs: SELECT * FROM customers WHERE id = ? (to return inserted row)
    ↓
Worker returns 201 JSON response
    ↓
api.js receives response
    ↓
customerStore.subscribe() triggers re-render
    ↓
Customer card appears in customers.html list
```

**Concrete example — User views Finance dashboard:**

```
finance.html loads
    ↓
financeStore.loadTransactions() (js/stores/FinanceStore.js)
    ↓
api.getTransactions() → db.getCollection('transactions')
    → GET /api/transactions
    ↓
Worker: SELECT * FROM transactions ORDER BY createdAt DESC
    ↓
JSON array returned
    ↓
financeStore.state.entities = transactions
    ↓
financeStore subscribers run → renderDashboard(), renderCharts()
    ↓
SVG charts rendered in finance.html based on real D1 data
```

---

## 5. Source of Truth

| Entity | Current Source of Truth | Persistence | Shared Across Devices? |
|---|---|---|---|
| Customers | Cloudflare D1 (`customers` table) | Permanent (server-side) | Yes |
| Orders | Cloudflare D1 (`orders` table) | Permanent (server-side) | Yes |
| Costings | Cloudflare D1 (`costings` table) | Permanent (server-side) | Yes |
| Finance Transactions | Cloudflare D1 (`transactions` table) | Permanent (server-side) | Yes |
| Inventory | Cloudflare D1 (`inventory` table) | Permanent (server-side) | Yes |
| Production Batches | Cloudflare D1 (`batches` table) | Permanent (server-side) | Yes |
| Quotations | Cloudflare D1 (`quotations` table) | Permanent (server-side) | Yes |
| Shipments | Cloudflare D1 (`shipments` table) | Permanent (server-side) | Yes |
| Users | Cloudflare D1 (`users` table — SHA-256 hashed password) | Permanent (server-side) | Yes |
| Sessions | Cloudflare D1 (`sessions` table — UUID tokens with expiry) | Expires (1 hour TTL) | Yes |
| Auth token (`gos_token`) | Browser `localStorage` | Until cleared or logout | No (per-browser) |
| Calculator draft (`gos_calc_v2_draft`) | Browser `sessionStorage` | Until tab/browser close | No (per-tab) |
| Customer computed stats (totalOrders, etc.) | Computed in memory by `api._enrichCustomerStats()` | Non-persistent (computed on each read) | Shared result but not stored |

---

## 6. Frontend vs Backend

### CLIENT-SIDE (Browser JavaScript)

| Component | Implementation |
|---|---|
| HTML pages | All `.html` files in `pages/`, `auth/` served as static assets |
| Frontend routing | `window.location.href` navigation between HTML files |
| State management | Store objects in `js/stores/` (in-memory, recreated on each page load) |
| API client | `js/data/database.js` → `fetch()` calls to `/api/*` |
| Business logic (partial) | `js/services/api.js` — order progress calculation, duplicate detection, data enrichment |
| UI rendering | All template functions in `js/*/templates.js` — pure DOM string building |
| Client-side validation | Form validation in each page's `index.js` (e.g., required field checks before API calls) |
| Auth token management | `localStorage.getItem/setItem/removeItem('gos_token')` |
| Calculator logic | All costing math in `calculator.html` inline `<script>` |
| Print generation | `window.printQuotation()` and print costing — all client-side, opens new window |

### SERVER-SIDE (Cloudflare Worker — `backend/worker.js`)

| Component | Implementation |
|---|---|
| API routing | Pathname-based routing inside Worker `fetch()` handler |
| Authentication middleware | Session token lookup in D1 `sessions` table on every `/api/*` request except `/api/auth/login` |
| Session management | UUID tokens stored in D1 `sessions` with `expiresAt` timestamp |
| Password hashing | `crypto.subtle.digest("SHA-256", ...)` in Worker (Web Crypto API) |
| Database access | `env.DB.prepare(sql).bind(...).run()/.first()/.all()` — D1 binding |
| Input handling (partial) | `isSafeField()` validation on search field names; JSON column serialization |
| Order progress calculation | `recalculateOrderProgress()` called in `database.js` (frontend) before API call — not in Worker |
| CORS | `Access-Control-Allow-Origin: *` on all API responses |
| Static asset serving | `env.ASSETS.fetch(request)` for all non-API routes |

### EXTERNAL SERVICE

| Service | Role |
|---|---|
| Cloudflare D1 | Production database |
| MongoDB Atlas | Only used by the local Express path (`MONGODB_URI` in `.dev.vars`); not connected to production Worker |
| Google Fonts (CDN) | Font loading in frontend HTML (`fonts.googleapis.com`) |
| Tailwind CSS CDN | `cdn.tailwindcss.com` loaded in every HTML page (client-side) |

---

## 7. Authentication & Users

### Login Flow

1. User submits username + password to `auth/login.html`
2. Frontend calls `POST /api/auth/login`
3. Worker checks for hardcoded developer credentials first (`username === 'admin' && password === '2906'`)
4. If not developer, SHA-256 hashes the password and queries D1: `SELECT id FROM users WHERE username = ? AND password_hash = ?`
5. If match found, generates a `crypto.randomUUID()` token, inserts into D1 `sessions` table with `expiresAt = Date.now() + 3600000` (1 hour)
6. Returns token to frontend
7. Frontend stores token in `localStorage` as `gos_token`
8. All subsequent API requests send `Authorization: Bearer <token>`
9. Worker validates token on every request: `SELECT * FROM sessions WHERE token = ? AND expiresAt > ?`

### Hardcoded Developer Credentials

The Worker contains hardcoded credentials:
```javascript
if (body.username === 'admin' && body.password === '2906') {
    user = { id: 'dev-admin', type: 'developer' };
}
```
These are **plaintext in the Worker source code** (`backend/worker.js`, line 125).

### Users Table

Initial user in `backend/seed.sql`:
```sql
INSERT OR IGNORE INTO users (id, username, password_hash) VALUES 
('u-admin', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
```
The hash `240be518...` is the SHA-256 hash of `admin123`.

### Token Expiry

Sessions expire after 1 hour. Expired tokens are rejected by the middleware. When a 401 is received, `database.js` removes `gos_token` from localStorage and redirects to `login.html`.

### Authorization

No role-based authorization beyond the user type distinction (`developer` vs `client`). Developer users are blocked from changing credentials (`PUT /api/auth/credentials` returns 403 if `session.userId === 'dev-admin'`). All other authenticated users have equal access to all data in all tables.

There are no per-user data scopes — all users see the same D1 data.

### Access Control Summary

| Question | Answer |
|---|---|
| Can anyone access the deployed application? | Yes (static assets are public); API requires a valid session token |
| Is there a login? | Yes — `auth/login.html` + `POST /api/auth/login` |
| Are users authenticated? | Yes — session token validated against D1 on every API request |
| Is there user-specific data? | No — all data in D1 is shared across all users |
| Are permissions enforced? | Minimal — only the developer credential update block |
| Is authorization enforced server-side? | Partial — session validation is server-side; no row-level authorization |
| Are credentials stored anywhere? | SHA-256 hashed in D1 `users` table; developer password (`2906`) hardcoded in `worker.js` |
| Are secrets exposed to the frontend? | Hardcoded developer password is in `worker.js` source (deployed server-side); not visible to browser. MongoDB URI is in `.dev.vars` (local only). |

---

## 8. Current Data Security

| Security Mechanism | Status | Detail |
|---|---|---|
| **HTTPS** | Present | Provided automatically by Cloudflare for all `*.workers.dev` domains and custom domains with Cloudflare proxy |
| **API Authentication** | Present | Bearer token required on all `/api/*` routes except `/api/auth/login`; validated against D1 sessions table |
| **Session expiry** | Present | 1-hour TTL enforced server-side in SQL: `WHERE expiresAt > ?` |
| **Password hashing** | Present | SHA-256 via Web Crypto API; passwords not stored in plaintext in D1 |
| **Authorization (row-level)** | Not Present | All authenticated users access all data; no per-user data isolation |
| **Role-based access control** | Not Present | No roles, no permissions beyond blocking developer credential updates |
| **Hardcoded credentials** | Present | `username === 'admin' && password === '2906'` is plaintext in `backend/worker.js` source code |
| **CORS** | Permissive | `Access-Control-Allow-Origin: *` — any origin can call the API with a valid token |
| **Input validation (server-side)** | Partial | Field name whitelist (`isSafeField()`), SQL parameterized queries (no SQL injection), JSON parse protection |
| **SQL Injection protection** | Present | All D1 queries use parameterized `bind()` — no string concatenation of user input into SQL |
| **CSP (Content Security Policy)** | Not Present | No CSP headers found in Worker responses or HTML |
| **Database credentials** | Not applicable | D1 accessed via Cloudflare binding — no connection string credential |
| **MongoDB Atlas URI** | Sensitive | `.dev.vars` contains a live Atlas URI with plaintext credentials; `.dev.vars` is in `.gitignore` |
| **`.dev.vars` in `.gitignore`** | Present | `.dev.vars` and `.dev.vars.*` are excluded from Git |
| **`.env` in `.gitignore`** | Present | `.env` and `.env.*` are excluded from Git |
| **Sensitive data in source** | Present | Developer password `2906` is in `worker.js` which is committed to the repository |
| **Cloudflare Secrets** | Unknown | `DEPLOYMENT.md` instructs running `npx wrangler secret put MONGODB_URI` — whether this is currently configured in the Cloudflare account is unknown without account access |
| **Session invalidation on logout** | Partial | Frontend removes `gos_token` from localStorage; old tokens in D1 are not deleted on logout (they expire naturally after 1 hour) |
| **Client-side validation** | Present | Required field validation in form handlers before API calls |
| **Server-side validation** | Partial | Table whitelist, field name check; no schema validation of incoming JSON body fields |

---

## 9. Backups & Recovery

### Automatic Backups

**Cloudflare D1**: As of the current architecture, Cloudflare D1 (especially on the free tier) does not provide automatic point-in-time backups or database snapshots that are user-accessible. Cloudflare's infrastructure provides availability redundancy, but this is not the same as user-controlled backups.

### Manual Backups

No manual backup script exists in the repository. There is no `backup.js`, no `export.js`, no cron job, no scheduled export.

### Export Functionality

- The "Export as CSV" button in Orders (bulk mode) and Finance (bulk mode) fires a `showToast('Exporting...', 'info')` only — **no actual file is generated or downloaded**.
- The "Export as PDF" and "Export as CSV" buttons in Reports page have no handlers — **non-functional**.
- There is no `/api/export` endpoint in the Worker.

### Import Functionality

No import functionality exists in the UI or API.

### Seed Scripts

`backend/seed.sql` (for D1) and `backend/scripts/seed.js` (for MongoDB) exist as one-way seeding mechanisms. Running the SQL seed again uses `INSERT OR IGNORE` (will not overwrite existing data). Running `seed.js` calls `deleteMany()` first (destructive).

### Recovery

| Scenario | Outcome |
|---|---|
| Production data deleted via API | No recovery — no backup exists |
| Worker redeployed | Data survives (D1 is independent) |
| Cloudflare project/Worker deleted | Data in D1 **may** be retained in the Cloudflare account database, but this depends on Cloudflare account management — UNKNOWN |
| Cloudflare account deleted | D1 data lost — UNKNOWN recovery path |
| Browser/localStorage cleared | Session token lost, must re-login; D1 data is unaffected |
| Code redeployed | Data survives (D1 is independent) |
| Application moved to another host | D1 data stays in Cloudflare account; inaccessible from new host without a migration |

---

## 10. Deployment vs Data Storage

### Application (Code)

- **Lives in**: Git repository → Cloudflare Workers (deployed via `wrangler deploy`)
- **What it is**: `backend/worker.js` (Worker script) + static HTML/CSS/JS files
- **Controlled by**: Developer; any machine with Cloudflare credentials can deploy
- **Is it persistent?**: Redeployable at any time; previous deployment versions available via `wrangler rollback`

### Data

- **Lives in**: Cloudflare D1 — `garment-os-db` (ID: `a307df89-71b4-4eed-a45e-54fecb72e614`) inside the Cloudflare account
- **What it is**: SQLite database with 10 tables
- **Controlled by**: Cloudflare account owner
- **Is it persistent?**: Yes, independent of Worker deployments

### Separation

These two are **independent**:

| If... | Application | Data |
|---|---|---|
| Worker is redeployed | New version goes live | **Unchanged** |
| Worker is rolled back | Previous version goes live | **Unchanged** |
| Static assets are updated | New assets served | **Unchanged** |
| Cloudflare account is intact | N/A | **Remains in D1** |
| Application is moved to Vercel/Netlify | New app deployed | **Stays in Cloudflare D1 — inaccessible from new host** |
| Cloudflare account is deleted | Application gone | **D1 data lost** |

The **data is hosted inside Cloudflare** (D1). If the application moves away from Cloudflare, the D1 data cannot travel with it without a manual migration. The D1 data and the Cloudflare deployment are tied to the **same Cloudflare account**.

---

## 11. Deployment Change / Portability

### What Would Need to Move

If the application is moved from Cloudflare Workers to another platform:

| Component | What Moves | Difficulty |
|---|---|---|
| **Application Code** | All static HTML/CSS/JS files + `backend/` source code | Easy — standard files |
| **Database** | D1 data cannot be directly migrated; requires SQL dump + reimport | Medium (schema is in `schema.sql`; no export tool exists in the app) |
| **Worker Script** | `backend/worker.js` uses D1 binding (`env.DB`) and Cloudflare ASSETS binding — both are Cloudflare-specific APIs | Significant rewrite required |
| **Alternative Backend** | `backend/app.js` (Express + Mongoose) provides a portable alternative backend targeting MongoDB | Available as-is for non-Cloudflare deployments |
| **Environment Variables / Secrets** | `MONGODB_URI` secret (in Cloudflare) must be reconfigured | Easy if switching to Express path |
| **Domain** | Cloudflare domain/Workers route configuration | Varies by registrar |
| **Authentication** | Session token logic in Worker is rewritable; SHA-256 Web Crypto compatible with Node.js | Easy |
| **Server Functions** | Worker fetch handler logic must be ported to a framework (e.g., Express, Hono, Fastify) | Medium |
| **CORS** | Worker sets `Access-Control-Allow-Origin: *` — must be replicated in new backend | Easy |
| **Static Asset Serving** | Currently via Cloudflare ASSETS binding — must be replicated with new host's static serving mechanism | Easy |
| **Cron Jobs** | None exist | N/A |
| **File/Image Storage** | No Cloudflare R2 or file storage is used | N/A |

### Cloudflare-Specific Dependencies

| Dependency | Reason Cloudflare-Specific |
|---|---|
| `env.DB.prepare(sql)` | Cloudflare D1 API — not available outside Cloudflare |
| `env.ASSETS.fetch(request)` | Cloudflare Workers Static Assets binding |
| `crypto.randomUUID()` / `crypto.subtle.digest()` | Web Crypto API — available in modern Node.js too, so not exclusively Cloudflare |
| `wrangler.jsonc` | Cloudflare deployment configuration |
| D1 database itself | Lives in Cloudflare account |

### Hosting-Independent Components

| Component | Notes |
|---|---|
| All frontend HTML/CSS/JS | Standard web files, no Cloudflare-specific APIs |
| `backend/app.js` (Express) | Can run on any Node.js host with MongoDB |
| `backend/schema.sql` | Standard SQLite SQL — portable to any SQLite instance |
| `backend/seed.sql` | Standard SQLite SQL |
| `js/data/mockData.js` | Plain JavaScript data file |
| Authentication logic | SHA-256 and UUID generation are standard |
| API route structure | `/api/:collection/:id` pattern is generic REST |

### Portability to Alternative Backends

The project already has an Express + MongoDB path (`backend/app.js`). Switching the production deployment to use Express (on Vercel, Render, Railway, a VPS, etc.) + MongoDB Atlas would require:
1. Pointing `js/config.js` API base URL to the new server
2. Deploying `backend/server.js` to the new platform
3. Migrating D1 data to MongoDB (manual ETL — no tool exists)

---

## 12. Environment Variables & Secrets

| Variable | Location | Client/Server | Sensitive? | Purpose |
|---|---|---|---|---|
| `MONGODB_URI` | `.dev.vars` (local, gitignored); Cloudflare Secrets (per DEPLOYMENT.md) | Server | **Yes** | MongoDB Atlas connection string with credentials |
| `NODE_ENV` | `.dev.vars` (local) | Server | No | Node.js environment mode |
| `PORT` | `.env.example` | Server | No | Local Express server port (5000) |
| `CORS_ORIGIN` | `.env.example` | Server | No | Allowed CORS origin for Express server |
| Hardcoded admin password (`2906`) | `backend/worker.js` line 125 | Server-side (Worker) | **Yes** | Developer login bypass |
| Hardcoded admin password hash | `backend/seed.sql` line 22 | Server-side (seed script) | **Yes** | SHA-256 hash of `admin123` |
| MongoDB Atlas URI with credentials | `.dev.vars` line 5 | Local only | **Yes** | Live Atlas cluster credential committed to this file |

### Key Findings

- `.dev.vars` is **gitignored** (correct) but **currently contains a live MongoDB Atlas URI** with real credentials for `garment_admin` user on `garmentos.x5ckuow.mongodb.net`.
- The developer bypass password `2906` is committed **in plaintext** to `backend/worker.js` which is version-controlled.
- The seed SQL contains the SHA-256 hash of `admin123` — this is the password for the `u-admin` database user.
- No environment variable is sent to the browser. The frontend only reads `window.GARMENT_OS_CONFIG` (if set) or derives the API URL from `window.location`.
- Cloudflare D1 does not use connection strings — it is accessed via the `env.DB` binding configured in `wrangler.jsonc`, which is safe.

---

## 13. File / Image / Document Storage

**No file, image, or document storage is implemented.**

| File Type | Status |
|---|---|
| Customer documents | Not stored |
| Order attachments | Not stored |
| Product images | Not stored |
| Fabric images | Not stored |
| Invoices (PDF) | Not stored — Print to PDF is browser-native `window.print()` only; no server-side generation |
| Logos | `assets/logo-primary.webp` is a static asset deployed with the Worker; not stored per-record |
| Photos | Not stored |
| Cloudflare R2 | Not configured — not present in `wrangler.jsonc` |
| Cloudflare KV | Not configured |
| Any binary storage | Not present |

The "Print" functionality for quotations and costings opens a new browser window with inline HTML and calls `window.print()` — this is a browser print dialog, not server-side PDF generation. No file is saved to any storage.

---

## 14. Database Migration Portability

### Current State

| Factor | Current State |
|---|---|
| Schema definition | `backend/schema.sql` — full DDL for all 10 tables, standard SQLite syntax |
| Seed data | `backend/seed.sql` — `INSERT OR IGNORE` statements for all initial data |
| MongoDB equivalent | `backend/scripts/seed.js` reads from `js/data/mockData.js` and seeds MongoDB via Mongoose |
| IDs | String-based custom IDs (`c-001`, `ORD-992`, `cost-001`) generated by frontend `Date.now()` patterns |
| Relationships | Foreign keys exist as string fields (`customerId`, `orderId`, `costingId`) — not enforced by D1 (no `FOREIGN KEY` constraints in schema) |
| JSON sub-documents | `timeline`, `tasks`, `expenses`, `items`, `stageData` etc. stored as JSON strings in TEXT columns |
| Repository abstraction | `js/repositories/BaseRepository.js`, `OrderRepository.js`, `InventoryRepository.js` — all call `db._fetchAPI()` which hits the REST API; abstraction does not hide the database vendor |
| API abstraction | The Worker's generic CRUD handler (`/api/:table/:id`) provides a database-agnostic HTTP interface |
| Migration scripts | None exist for production data |
| Export from D1 | No built-in export in the application; would require Cloudflare's `wrangler d1 export` CLI command |

### Migration Difficulty Assessment (factual, not recommendations)

Moving data from D1 to another SQLite database or PostgreSQL/MySQL:
- Schema is portable (standard SQL; JSON columns would need type adjustments for PostgreSQL's `jsonb`)
- Data export requires: `npx wrangler d1 export garment-os-db --output dump.sql` or Cloudflare dashboard export
- No custom migration scripts exist in the codebase
- Relationships are soft (string ID references, no enforced FK constraints)

Moving data from D1 to MongoDB:
- Structure mismatch: JSON columns in D1 map well to MongoDB subdocuments
- ID convention (`c-001`, `ORD-992`) is already string-based, no numeric auto-increment dependency
- `backend/scripts/seed.js` and Mongoose models already provide the MongoDB schema definition

---

## 15. Current Deployment Health

### Deployment

| Property | Current State |
|---|---|
| Platform | Cloudflare Workers |
| Deployment method | Manual — `npx wrangler deploy` from developer machine |
| Frontend | Static HTML/CSS/JS files served via Cloudflare Workers Assets binding |
| Backend | Cloudflare Worker (`backend/worker.js`) — serverless, edge-deployed |
| API | REST API inside the same Worker — routes at `/api/*` |
| Database | Cloudflare D1 (SQLite) — `garment-os-db` |
| CI/CD | None |
| Build step | None |
| Version control | Git (`.git` directory present) |

### Persistence

| Property | Current State |
|---|---|
| Persistent data | All entity data in Cloudflare D1 (customers, orders, costings, transactions, inventory, batches, shipments, quotations, users, sessions) |
| Non-persistent data | Calculator draft (`sessionStorage`) — lost on tab close |
| Browser-only data | `gos_token` in `localStorage` (session token only) |
| Server-side data | All application data in D1 |

### Security

| Property | Current State |
|---|---|
| HTTPS | Present (Cloudflare) |
| Authentication | Present (session tokens in D1, 1-hour expiry) |
| Authorization | Minimal (session check only; no row-level or role-based) |
| Secrets | Hardcoded developer password in Worker source; MongoDB URI in local `.dev.vars` (gitignored) |
| Database protection | D1 accessed only via Worker binding — not publicly exposed |
| SQL Injection protection | Present (parameterized queries) |
| CORS | Permissive (`*`) |

### Backup

| Property | Current State |
|---|---|
| Automatic backup | None configured by the application |
| Manual backup | None implemented |
| Recovery mechanism | None |
| Export | UI export buttons are non-functional (toast only) |

### Portability

| Property | Current State |
|---|---|
| Application portability | Medium — static frontend is fully portable; Worker backend requires rewrite for non-Cloudflare (alternative Express backend exists) |
| Database portability | Low — D1 is Cloudflare-hosted; no export tool in the app; schema is standard SQL |
| Data portability | Low — no export, import, or migration tooling in the application |

---

## 16. The 20 Critical Questions

**1. WHERE IS THE GARMENT OS APPLICATION CURRENTLY DEPLOYED?**
Cloudflare Workers. The Worker script is deployed to Cloudflare's edge network. Static assets (HTML, CSS, JS) are served via the Cloudflare Workers Assets binding from the same Worker.

**2. WHERE IS THE ACTUAL PRODUCTION DATA CURRENTLY STORED?**
Cloudflare D1 — a SQLite database named `garment-os-db` (ID: `a307df89-71b4-4eed-a45e-54fecb72e614`) hosted within the Cloudflare account.

**3. IS THERE A REAL DATABASE?**
Yes. Cloudflare D1 is a real, managed, serverless SQLite database with persistent storage.

**4. IF THERE IS NO REAL DATABASE, WHAT IS CURRENTLY ACTING AS THE DATA STORE?**
N/A — there is a real database.

**5. ARE USER CHANGES PERSISTENT?**
Yes. All writes go through the Worker API to D1. Changes survive page refreshes, browser closes, and redeployments.

**6. ARE USER CHANGES SHARED ACROSS DEVICES?**
Yes. All data is stored server-side in D1.

**7. ARE USER CHANGES SHARED ACROSS USERS?**
Yes. There is one shared D1 database with no per-user data isolation. All authenticated users see and modify the same data.

**8. WHAT HAPPENS TO DATA WHEN THE APP IS REDEPLOYED?**
Nothing. D1 is independent of Worker deployments. Data is unaffected.

**9. WHAT HAPPENS TO DATA WHEN THE HOSTING PROVIDER IS CHANGED?**
D1 data stays in Cloudflare. The new hosting provider cannot access it without a manual data migration. The application would require a database change (to a database accessible from the new host).

**10. WHAT HAPPENS TO DATA IF THE CURRENT HOSTING ACCOUNT IS DELETED?**
D1 data is lost. Cloudflare D1 is tied to the Cloudflare account. Deleting the account destroys the database.

**11. IS THERE AUTHENTICATION?**
Yes. Login via `POST /api/auth/login`. Session tokens stored in D1 with 1-hour expiry. All API requests require `Authorization: Bearer <token>`.

**12. IS THERE AUTHORIZATION?**
Minimal. Only check is: developer account (`dev-admin`) cannot change credentials. No role-based access, no per-user data scoping.

**13. ARE SENSITIVE SECRETS PROTECTED?**
Partially. The MongoDB Atlas URI is in `.dev.vars` which is gitignored. The D1 binding requires no credentials. However, the developer bypass password (`2906`) is **hardcoded in plaintext** in `backend/worker.js`, which is committed to the Git repository.

**14. IS THERE A BACKUP?**
No application-level backup mechanism exists.

**15. IS THERE A RECOVERY MECHANISM?**
No. If data is deleted via the API, it cannot be recovered from within the application.

**16. CAN THE CURRENT DATA BE EXPORTED?**
Not from the application UI (export buttons are non-functional). D1 data can be exported via the Cloudflare CLI: `npx wrangler d1 export garment-os-db`.

**17. CAN THE CURRENT APPLICATION BE MOVED TO ANOTHER HOST?**
The frontend (HTML/CSS/JS) can be moved easily. The backend Worker (`backend/worker.js`) uses Cloudflare-specific APIs (`env.DB`, `env.ASSETS`) and cannot run on another host without modification. An Express-based alternative (`backend/app.js`) exists for non-Cloudflare deployment.

**18. CAN THE CURRENT DATA BE MOVED TO ANOTHER DATABASE?**
Yes, but no tooling exists within the application to do so. The schema (`schema.sql`) is standard SQL. A CLI export + import process would be needed. The JSON columns would need attention for non-SQLite targets.

**19. WHICH PARTS ARE CLOUD-SPECIFIC?**
- Cloudflare D1 (`env.DB` binding in Worker)
- Cloudflare Workers Assets (`env.ASSETS.fetch()`)
- Wrangler CLI deployment tooling
- `wrangler.jsonc` configuration

**20. WHICH PARTS ARE HOSTING-INDEPENDENT?**
- All frontend HTML, CSS, JavaScript files
- `backend/app.js` (Express + Mongoose — full alternative backend)
- `backend/schema.sql` (standard SQL schema)
- `backend/seed.sql` (standard SQL seed data)
- `js/data/mockData.js` (JavaScript data)
- All authentication logic (SHA-256, UUID — standard)
- REST API contract (`/api/:collection/:id`)

---

## 17. Current Infrastructure Diagram

```
USER (Browser)
      │
      │  HTTPS (Cloudflare TLS)
      ▼
┌─────────────────────────────────────────────────┐
│            Cloudflare Workers Edge              │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │           backend/worker.js              │  │
│  │                                          │  │
│  │  ┌─────────────────┐  ┌──────────────┐  │  │
│  │  │  Static Assets  │  │  API Handler │  │  │
│  │  │  (env.ASSETS)   │  │  /api/*      │  │  │
│  │  │                 │  │              │  │  │
│  │  │  HTML pages     │  │  Auth check  │  │  │
│  │  │  CSS files      │  │  CRUD ops    │  │  │
│  │  │  JS modules     │  │  SQL queries │  │  │
│  │  │  /assets/*      │  │              │  │  │
│  │  └─────────────────┘  └──────┬───────┘  │  │
│  └─────────────────────────────│────────────┘  │
│                                │                │
│                         env.DB binding          │
│                                │                │
│  ┌─────────────────────────────▼──────────────┐ │
│  │            Cloudflare D1                   │ │
│  │         "garment-os-db"                    │ │
│  │   ID: a307df89-71b4-4eed-a45e-54fecb72e614 │ │
│  │                                            │ │
│  │   Tables: customers, orders, inventory,    │ │
│  │   batches, transactions, costings,         │ │
│  │   shipments, quotations, users, sessions   │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

BROWSER STORAGE (client-only, not shared)
┌──────────────────────────────────┐
│  localStorage                    │
│    gos_token (session UUID)      │
│                                  │
│  sessionStorage                  │
│    gos_calc_v2_draft (calc state)│
└──────────────────────────────────┘

LOCAL DEVELOPMENT ONLY (not production)
┌──────────────────────────────────┐
│  node backend/server.js          │
│  Express + Mongoose (port 5000)  │
│          │                       │
│  MongoDB Atlas                   │
│  garmentos.x5ckuow.mongodb.net   │
│  (connected via .dev.vars URI)   │
└──────────────────────────────────┘

OR

┌──────────────────────────────────┐
│  npx wrangler dev (port 8787)    │
│  Miniflare Worker emulation      │
│          │                       │
│  Local SQLite file               │
│  .wrangler/state/v3/d1/*.sqlite  │
│  (separate from production D1)   │
└──────────────────────────────────┘
```
