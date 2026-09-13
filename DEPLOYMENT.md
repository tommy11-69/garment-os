# Garment OS — Production Deployment Guide

This guide covers deploying Garment OS to **Hostinger LiteSpeed Web Server** with **PHP 8.3** and **MariaDB / MySQL**, using git-based automated deployment.

---

## 1. Architecture Overview

```
                      +------------------------------------------+
                      |         Hostinger Custom Domain          |
                      |          (e.g., https://yourdomain.com)  |
                      +--------------------+---------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
         [Static Asset Routes]                             [API Routes]
     - / (redirect to dashboard)                           - /api/index.php (PHP 8.3 REST)
     - /pages/* (ERP pages)                                - /api/customers
     - /auth/* (login, forgot-pw)                          - /api/orders
     - /css/*, /js/*, /assets/*                            - /api/inventory
                                                           - /api/billings
                                                           - /api/transactions
                                                           - /api/finance
                                                                  |
                                                           +---------------+
                                                           |  PDO MySQL    |
                                                           |  Connection   |
                                                           +-------+-------+
                                                                   |
                                                      +------------+------------+
                                                      |   Hostinger MariaDB DB  |
                                                      +-------------------------+
```

---

## 2. Prerequisites

- **Hostinger Account**: Premium / Business Web Hosting with LiteSpeed & PHP 8.3
- **MariaDB Database**: Created via Hostinger hPanel > Databases
- **Git Repository**: GitHub repository (`main` branch connected to Hostinger Git Deployment)

---

## 3. Hostinger Server Setup

### Step 3.1: Database Configuration (`api/config.php`)

Ensure `api/config.php` exists on the server with your Hostinger database credentials:

```php
<?php
return [
    'host' => 'localhost',
    'database' => 'u123456789_garmentos',
    'username' => 'u123456789_admin',
    'password' => 'YOUR_STRONG_DATABASE_PASSWORD',
    'charset'  => 'utf8mb4'
];
```

*Note: `api/config.php` is excluded from git for security.*

### Step 3.2: Hostinger Git Deployment Setup

1. Log in to **Hostinger hPanel**.
2. Navigate to **Advanced > Git**.
3. Create a new Git repository connection:
   - **Repository Branch**: `main`
   - **Target Directory**: `public_html/`
4. Enable **Auto Deployment** (or click **Deploy** to manually pull updates from GitHub).

---

## 4. Local Development Options

### Option A: Local Wrangler / Cloudflare Worker Emulation
```powershell
# Run local D1 + Worker dev server on port 8787
npm run dev:worker
```

### Option B: Local PHP Dev Server
```powershell
# Run PHP built-in server for testing Hostinger api/index.php
php -S localhost:8000
```

---

## 5. Migration & Automated Schema Sync

All database tables (e.g. `billing_master`, `billing_items`, `billing_counters`, `customers`, `orders`, `transactions`) are auto-created on hostinger upon the first API request via `CREATE TABLE IF NOT EXISTS` inside `api/index.php`. No manual SQL table creation is needed.

---

## 6. Deployment Verification

1. **Verify API status**:
   - Access `https://yourdomain.com/api/index.php/customers` in browser or curl.
2. **Verify Frontend**:
   - Open `https://yourdomain.com/pages/billings.html`.
