# Garment OS — Production Deployment & DevOps Architecture Handbook

> **System Version:** 5.2 Enterprise Production  
> **Target Cloud Infrastructure:** Hostinger LiteSpeed Web Server (PHP 8.3 + MariaDB InnoDB)  
> **Local Emulation Runtime:** Cloudflare Workers (V8 JavaScript + D1 SQLite)  
> **Live Production URL:** `https://garment-os.udhayaatextiles.com`  
> **Deployment Pipeline:** GitHub Actions Automated FTP Deployment (`.github/workflows/deploy.yml`)

---

## 1. System Architecture & Topology

Garment OS operates on a **dual-runtime paradigm**: a production-optimized PHP 8.3 LiteSpeed REST server on Hostinger connected to MariaDB, and a local developer runtime powered by Cloudflare Workers and D1 SQLite.

```
                                  [ Client Layer ]
              Desktop (Chrome/Safari) | Tablet (iPad/Android) | Mobile PWA
                                         |
                                         | HTTPS (Port 443)
                                         v
                         +-------------------------------+
                         |   Hostinger LiteSpeed Edge    |
                         |  (HTTP/3, SSL, Brotli/Gzip)   |
                         +---------------+---------------+
                                         |
                     +-------------------+-------------------+
                     |                                       |
                     v                                       v
         [ Static Web Root ]                        [ Rewrite Engine ]
      index.html (Auth Router)                     .htaccess rules:
      /pages/*.html (20 Modules)                   /api/* -> api/index.php
      /components/*.html (Partials)                          |
      /css/*, /js/*, /assets/*                               v
                                                   +-------------------+
                                                   |   PHP 8.3 Engine  |
                                                   |   (LiteSpeed SAPI)|
                                                   +---------+---------+
                                                             |
                                           +-----------------+-----------------+
                                           |                                   |
                                    (Main Tenant)                       (Demo Showcase)
                                           |                                   |
                                           v                                   v
                             +---------------------------+       +---------------------------+
                             |  MariaDB: garment_os      |       |  MariaDB: garmentosdemo   |
                             |  - Production ERP Data    |       |  - Read-only Isolated Data|
                             |  - Sessions & Credentials |       |  - Ephemeral Guest Auth   |
                             +---------------------------+       +---------------------------+
```

### Core Repository Layout

```
garment_os/
├── .github/workflows/deploy.yml    # CI/CD automated FTP deployment to Hostinger
├── .htaccess                       # LiteSpeed routing, Authorization headers & cache control
├── .gitignore                      # Hardened security rules (protects credentials & dumps)
├── index.html                      # Root auth router (redirects to /pages or /auth)
├── manifest.json                   # Progressive Web App (PWA) manifest
├── api/                            # PRODUCTION BACKEND (Hostinger PHP 8.3)
│   ├── config.example.php          # Sanitized configuration template (tracked)
│   ├── config.php                  # Active credentials (untracked / gitignored)
│   └── index.php                   # Monolithic high-performance REST API router
├── auth/                           # Authentication views (login.html, forgot-password.html)
├── pages/                          # Application ERP views (20 modular HTML screens)
├── components/                     # Reusable HTML UI fragments (sidebar, bottom-nav, topbar)
├── css/                            # Modern CSS design system (layout, responsive, typography)
├── js/                             # Client-side architecture
│   ├── app.js                      # Application lifecycle, auth guard & component loader
│   ├── config.js                   # Dynamic API base URL resolver
│   ├── renderers.js                # Shared DOM template rendering utilities
│   ├── tailwind.config.js          # Tailwind runtime configuration
│   ├── data/database.js            # Central HTTP REST client & token injector
│   ├── services/api.js             # High-level domain service methods
│   ├── repositories/               # Repository pattern data access layer
│   ├── stores/                     # Reactive state stores per domain
│   ├── utils/                      # UI utilities (bottom sheets, toasts, dialogs)
│   └── [domain]/                   # Domain-specific UI controllers (billings, orders, etc.)
├── assets/                         # Optimized logos, favicons, and PWA icon sets
├── dev/                            # LOCAL DEVELOPMENT & TOOLING
│   ├── worker.js                   # Cloudflare Worker API router (local D1 emulation)
│   ├── sql/                        # Canonical SQLite schemas & seed datasets
│   └── scripts/                    # Test suites (audit_live_api.js, smoke-test.js)
├── docs/                           # Architecture audits, product workflows & specifications
├── package.json                    # Dev environment scripts & wrangler runner
├── wrangler.dev.jsonc              # Local D1 emulation configuration (Port 8787)
└── wrangler.jsonc                  # Cloudflare worker production specification
```

---

## 2. Hostinger LiteSpeed Environment Setup

### 2.1 Server Specifications
* **Web Server:** LiteSpeed Enterprise Web Server
* **PHP Runtime:** PHP 8.3 (with `pdo_mysql`, `json`, `mbstring`, `openssl` extensions enabled)
* **Database Engine:** MariaDB 10.11+ / MySQL 8.0+ (InnoDB Engine, `utf8mb4_unicode_ci`)
* **HTTP Protocols:** HTTP/2 & HTTP/3 (QUIC) enabled
* **Document Root:** `public_html/` (or designated subdomain root e.g. `garment-os.udhayaatextiles.com`)

### 2.2 Critical LiteSpeed `.htaccess` Configuration
The root `.htaccess` handles two essential production requirements:
1. **Authorization Header Pass-Through:** In LiteSpeed / Apache FastCGI mode, the HTTP `Authorization: Bearer <token>` header is stripped by default unless explicitly captured and injected into PHP environment variables.
2. **SPA / API Routing:** Rewrites `/api/(.*)` requests directly to `api/index.php` without requiring file extensions in request URLs.

```apache
<IfModule mod_headers.c>
    # Disable caching on HTML entry files to ensure immediate updates after deploys
    <FilesMatch "\.(html|htm)$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>
    # Revalidate CSS & JS assets
    <FilesMatch "\.(js|css)$">
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Forward Authorization header to PHP in FastCGI / LiteSpeed
    RewriteCond %{HTTP:Authorization} ^(.*)
    RewriteRule .* - [e:HTTP_AUTHORIZATION:%1]
    SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1

    # Route all /api/* calls to api/index.php
    RewriteRule ^api/(.*)$ api/index.php [QSA,L]
    RewriteRule ^api$ api/index.php [QSA,L]

    # Fallback to index.html for non-file SPA routes
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</IfModule>
```

---

## 3. Database Architecture & Provisioning

### 3.1 Dual-Database Strategy (Production vs. Demo Showcase)
Garment OS enforces strict tenant isolation using two databases configured in `api/config.php`:
* **Main Database (`u465023737_garment_os`):** Houses real production manufacturing orders, client directory, ledger entries, and administrator accounts.
* **Demo Showcase Database (`u465023737_garmentosdemo`):** Houses sanitized demo data. When a user logs in using `guest` or `demo` credentials, the backend routes queries exclusively to this database, protecting production records.

### 3.2 Secure Database Configuration (`api/config.php`)
> [!IMPORTANT]
> `api/config.php` contains production database credentials and is **strictly excluded from Git tracking** via `.gitignore`. Never commit this file to a public or private repository.

On the Hostinger server, create or verify `api/config.php`:
```php
<?php
// Garment OS — Hostinger Production Database Configuration
return [
    'host'          => getenv('DB_HOST') ?: 'localhost',
    'database'      => getenv('DB_NAME') ?: 'u465023737_garment_os', 
    'username'      => getenv('DB_USER') ?: 'u465023737_garment_admin', 
    'password'      => getenv('DB_PASS') ?: 'YOUR_STRONG_PASSWORD_HERE', 
    'demo_database' => getenv('DEMO_DB_NAME') ?: 'u465023737_garmentosdemo',
    'demo_username' => getenv('DEMO_DB_USER') ?: 'u465023737_garmentosguest',
    'demo_password' => getenv('DEMO_DB_PASS') ?: 'YOUR_DEMO_PASSWORD_HERE',
    'charset'       => 'utf8mb4'
];
```

### 3.3 Zero-Maintenance Schema Auto-Sync
Garment OS does not require manual SQL migration runs during standard deployments. `api/index.php` contains an **idempotent auto-migration subsystem** that verifies and provisions required tables upon the first API call:

| Table Name | Primary Key | Key JSON Columns | Purpose |
| :--- | :--- | :--- | :--- |
| `billing_master` | `id` (VARCHAR 191) | — | Invoices, quotations, payment entries, purchase orders |
| `billing_items` | `id` (VARCHAR 191) | — | Line items linked to billing master serials |
| `billing_counters`| `prefix` (VARCHAR 64) | — | Atomic auto-incrementing serial generator (e.g. `AG-QTY-2026-0001`) |
| `customers` | `id` (VARCHAR 191) | — | Client profiles, contacts, GSTIN, credit limits |
| `vendors` | `id` (VARCHAR 191) | — | Supplier & vendor directory with payment history |
| `orders` | `id` (VARCHAR 191) | `sizes`, `colours`, `timeline`, `tasks`, `expenses` | Full manufacturing production orders & stage tracking |
| `inventory` | `id` (VARCHAR 191) | `movementHistory`, `specifications` | Fabric rolls, trims, yarn stock, and alerts |
| `batches` | `id` (VARCHAR 191) | `expenses`, `consumptions` | Production cut & stitch batch tracking |
| `transactions` | `id` (VARCHAR 191) | — | Double-entry journal for accounts & balance sheets |
| `costings` | `id` (VARCHAR 191) | `materials`, `uData` | Pattern cost calculators & consumption sheets |
| `quotations` | `id` (VARCHAR 191) | `items` | Client quote generator with discount matrix |
| `users` | `id` (VARCHAR 191) | — | Admin & operator accounts with SHA-256 password hash |
| `sessions` | `token` (VARCHAR 191) | — | Active bearer tokens with expiration timestamps |
| `authenticators` | `credentialId` (VARCHAR 191) | — | FIDO2 / WebAuthn biometric security keys |

---

## 4. Automated CI/CD Pipeline (GitHub Actions)

### 4.1 Automated FTP Synchronization
Garment OS utilizes `.github/workflows/deploy.yml` to synchronize code directly to Hostinger upon every `git push` to `main`.

```yaml
name: Deploy Garment OS to Hostinger

on:
  push:
    branches:
      - main

jobs:
  web-deploy:
    name: Deploy to Hostinger via FTP
    runs-on: ubuntu-latest
    steps:
      - name: 🚚 Get latest code
        uses: actions/checkout@v4

      - name: 📂 Sync files to Hostinger Subdomain
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          server-dir: ./
          exclude: |
            **/.git*
            **/.git*/**
            **/node_modules/**
            dev/**
            docs/**
            .dev.vars*
            *.md
            package*.json
            wrangler*.jsonc
            *.log
```

### 4.2 Required GitHub Repository Secrets
To configure or update the CI/CD pipeline, navigate to **GitHub Repo > Settings > Secrets and variables > Actions** and set:
* `FTP_SERVER`: Hostinger FTP host (e.g., `ftp.yourdomain.com` or server IP).
* `FTP_USERNAME`: Dedicated FTP username created in Hostinger hPanel.
* `FTP_PASSWORD`: Secure FTP password.

> [!TIP]
> Always set the FTP root directory in Hostinger FTP Accounts directly to the target web root (e.g. `public_html/` or your subdomain folder). This allows `server-dir: ./` in GitHub Actions to sync cleanly without risk of overwriting sibling sites.

---

## 5. Local Development Environments

Garment OS provides two primary local development modes:

### Option A: Local Cloudflare Worker + D1 Emulation (Recommended)
This mode runs the JavaScript engine (`dev/worker.js`) using local SQLite D1 emulation. It mirrors 100% of the REST endpoints provided by `api/index.php`.

```powershell
# 1. Install dev dependencies (wrangler)
npm install

# 2. Launch local Worker dev server on port 8787
npm run dev:worker
```
* **Frontend Access:** Open `http://localhost:8787` or serve static pages via VS Code Live Server on port 5500.
* **Auto-Discovery:** `js/config.js` automatically detects if you are developing locally on port 8787, 5500, or 3000 and routes API calls to `http://localhost:8787/api`.

### Option B: Local PHP Built-in Server
If you are developing or testing changes directly for Hostinger's PHP backend:

```powershell
# Run local PHP server from repository root
php -S localhost:8000
```
* Ensure you have copied `api/config.example.php` to `api/config.php` and pointed it to a local MySQL/MariaDB instance.

---

## 6. Authentication, Sessions & Security Policies

### 6.1 Authentication Modes

| Mode | Endpoint | Credentials | Behavior |
| :--- | :--- | :--- | :--- |
| **Standard Admin** | `POST /api/auth/login` | Verified against `users` table | Returns bearer token with 1-hour expiration; full access to production MariaDB. |
| **Showcase Guest** | `POST /api/auth/login` | `guest` / `guest@183` or `demo` / `demo@183` | Returns `demo-<hash>` token; redirects requests to the isolated `garmentosdemo` database. |
| **Developer Fallback** | `POST /api/auth/login` | `admin` / `admin123` | Failsafe admin login when initial `users` table is empty. |
| **WebAuthn Biometric** | `POST /api/auth/webauthn/*` | Touch ID / Windows Hello / FaceID | Passwordless authentication using FIDO2 cryptographic challenge-response. |

### 6.2 Token Lifecycle & Client Injection
1. Upon successful login, the API issues a random 32-character hex token and saves it in the `sessions` table with an epoch timestamp (`expiresAt`).
2. Client stores token in `localStorage.getItem('gos_token')`.
3. `js/data/database.js` injects `Authorization: Bearer <token>` into every subsequent fetch request.
4. If the server responds with `401 Unauthorized`, `js/data/database.js` clears `localStorage` and routes the user back to `auth/login.html`.

### 6.3 Security Checklist & Password Rotation
* **Credentials in Git:** Ensure `api/config.php` and `.dev.vars` remain uncommitted. If credentials are ever accidentally pushed, immediately rotate them in **Hostinger hPanel > Databases > Database Users**.
* **CORS Lockdown:** In production, `api/index.php` and `.htaccess` restrict incoming methods to `GET, POST, PUT, DELETE, OPTIONS` with strict header validation.
* **SQL Injection Prevention:** All queries in `api/index.php` strictly utilize PDO Prepared Statements (`$pdo->prepare(...)` and `$stmt->execute([...])`). Table names and columns are validated against hardcoded white-lists (`ALLOWED_TABLES`).

---

## 7. Production API Endpoint Directory

All endpoints accept and return `application/json`. Requests require a valid `Authorization: Bearer <token>` header (except `/auth/login` and `/health`).

### Authentication
* `POST /api/auth/login` — Authenticate and receive session token.
* `POST /api/auth/logout` — Revoke active token.
* `POST /api/auth/webauthn/register-options` — Generate WebAuthn challenge.
* `POST /api/auth/webauthn/register-verify` — Store biometric authenticator.
* `POST /api/auth/webauthn/login-options` — Generate login challenge.
* `POST /api/auth/webauthn/login-verify` — Verify biometric response.

### Core Entity CRUD
Supported collections: `customers`, `vendors`, `orders`, `inventory`, `batches`, `costings`, `quotations`, `shipments`.

* `GET /api/{collection}` — Fetch collection list (supports query params: `?limit=50&page=1&q=search_term&fields=name,phone`).
* `GET /api/{collection}/{id}` — Fetch specific record by UUID.
* `POST /api/{collection}` — Insert new record (auto-generates UUID if omitted).
* `PUT /api/{collection}/{id}` — Full or partial update of existing record.
* `DELETE /api/{collection}/{id}` — Delete record.

### Advanced Billings Subsystem
* `GET /api/billings` — Comprehensive listing of all invoices, purchase orders, payment ins/outs.
* `POST /api/billings` — Atomic creation of billing master, line items, and ledger transaction entry.
* `GET /api/billings/preview-serial?type={type}` — Preview next auto-generated document number.
* `DELETE /api/billings/{id}` — Cascade delete bill master and associated line items.

### Financials & Telemetry
* `GET /api/finance/overview` — Aggregated revenue, outstanding balance, and expense matrix.
* `GET /api/transactions` — Double-entry transaction ledger.
* `GET /api/telemetry` — Server health, latency, uptime, and memory usage metrics.
* `GET /api/health` — Basic liveness probe (returns `{ "status": "ok", "runtime": "PHP 8.3 LiteSpeed" }`).

---

## 8. Operational Runbooks & Troubleshooting

### Runbook 1: Diagnosing Live API Health
Run the automated diagnostics suite directly from your local terminal:

```powershell
npm run audit:live
```
This tests live connectivity to `garment-os.udhayaatextiles.com`, executes login authentication, validates collection read operations, and tests pagination.

Alternatively, execute a quick curl test:
```bash
curl -I https://garment-os.udhayaatextiles.com/api/health
```
**Expected Response:** `HTTP/2 200 OK` or `HTTP/3 200 OK` with `content-type: application/json`.

---

### Runbook 2: Fixing "401 Unauthorized" Loop on Fresh Deploys
* **Symptom:** User logs in successfully, but immediate subsequent page loads bounce back to `auth/login.html`.
* **Root Cause:** LiteSpeed Web Server is not passing the `Authorization` header through FastCGI to PHP.
* **Remedy:** Open `.htaccess` on the server and confirm lines 18–23 are present:
  ```apache
  RewriteCond %{HTTP:Authorization} ^(.*)
  RewriteRule .* - [e:HTTP_AUTHORIZATION:%1]
  SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
  ```

---

### Runbook 3: Resolving "500 Internal Server Error" on API Calls
* **Symptom:** Opening any page yields `Failed to fetch` toasts; `/api/customers` returns HTTP 500.
* **Remedy:**
  1. Inspect `api/config.php` on the Hostinger server.
  2. Verify that the MariaDB hostname is set to `localhost`.
  3. Ensure database name and username match Hostinger's prefix convention (e.g. `u465023737_...`).
  4. Test MySQL connection via **Hostinger hPanel > phpMyAdmin**.

---

### Runbook 4: Emergency Zero-Downtime Rollback
If a faulty commit is pushed to `main`:
```bash
# 1. Identify the last healthy commit hash
git log --oneline -5

# 2. Revert the problematic commit locally
git revert HEAD --no-edit

# 3. Push to main to trigger immediate GitHub Actions redeploy
git push origin main
```
The FTP action will overwrite only the modified files on Hostinger in under 45 seconds.
