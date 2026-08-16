# Garment OS — Production Deployment Guide

This guide covers deploying Garment OS as a unified **Cloudflare Worker with Static Assets** backed by **MongoDB Atlas**.

---

## 1. Architecture Overview

```
                      +------------------------------------------+
                      |         Cloudflare Worker Domain         |
                      |          (e.g., erp.yourdomain.com)      |
                      +--------------------+---------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
         [Static Asset Routes]                             [API Routes]
     - / (redirect to dashboard)                           - /health
     - /pages/* (ERP pages)                                - /api/customers
     - /auth/* (login, forgot-pw)                          - /api/orders
     - /css/*, /js/*, /assets/*                            - /api/inventory
                    |                                      - /api/batches
            Served via Cloudflare                          - /api/transactions
            Workers Static Assets                          - /api/costings
                                                           - /api/shipments
                                                           - /api/quotations
                                                                  |
                                                           +---------------+
                                                           | Mongoose 8.x  |
                                                           | (nodejs_compat|
                                                           |  Connection)  |
                                                           +-------+-------+
                                                                   |
                                                      +------------+------------+
                                                      |   MongoDB Atlas Cluster |
                                                      |   (Database: garment_os)|
                                                      +-------------------------+
```

---

## 2. Prerequisites

- **Node.js**: v18.0.0 or higher
- **Cloudflare Account**: [dash.cloudflare.com](https://dash.cloudflare.com)
- **MongoDB Atlas Account**: [cloud.mongodb.com](https://cloud.mongodb.com)
- **Wrangler CLI**: Included via `npx wrangler`

---

## 3. Step-by-Step Setup

### Step 3.1: Configure MongoDB Atlas

1. **Create Cluster**:
   - Log into MongoDB Atlas and create an M0 (Free) or Dedicated cluster.
2. **Create Database User**:
   - Navigate to **Security** > **Database Access** > **Add New Database User**.
   - Select Password authentication (e.g. username: `garment_admin`, strong password).
   - Assign `Read and write to any database` role.
3. **Configure Network Access**:
   - Navigate to **Security** > **Network Access** > **Add IP Address**.
   - Add `0.0.0.0/0` (Allow Access from Anywhere) because Cloudflare Workers run on globally distributed dynamic IP addresses.
4. **Obtain Connection String**:
   - Click **Connect** > **Drivers** (Node.js).
   - Copy the SRV string and replace `<password>` and add `/garment_os`:
     ```
     mongodb+srv://garment_admin:<password>@cluster0.abcde.mongodb.net/garment_os?retryWrites=true&w=majority
     ```

---

### Step 3.2: Local Development Setup

```powershell
# 1. Install dependencies
npm install

# 2. Configure local environment variables
Copy-Item .env.example .env

# Edit .env with your local or Atlas URI
# MONGODB_URI=mongodb://localhost:27017/garment_os

# 3. Seed initial ERP data (optional)
npm run seed

# 4. Start local Express backend (Port 5000)
npm run start

# 5. Run smoke tests against local backend
npm run test:smoke
```

---

### Step 3.3: Local Cloudflare Worker Emulation

```powershell
# 1. Copy dev vars example
Copy-Item .dev.vars.example .dev.vars

# 2. Add your MongoDB Atlas connection string inside .dev.vars
# MONGODB_URI=mongodb+srv://garment_admin:<password>@cluster0.abcde.mongodb.net/garment_os?retryWrites=true&w=majority

# 3. Launch Wrangler local dev server (serves frontend + API on port 8787)
npx wrangler dev

# 4. Run smoke test against Wrangler dev server
$env:TEST_API_URL="http://localhost:8787"
node backend/scripts/smoke-test.js
```

---

### Step 3.4: Deploy to Cloudflare Workers

```powershell
# 1. Authenticate with Cloudflare
npx wrangler login

# 2. Set the production MongoDB Atlas secret in Cloudflare
npx wrangler secret put MONGODB_URI
# (Paste your MongoDB Atlas SRV URI when prompted)

# 3. Deploy the full-stack Worker (Assets + Express API)
npx wrangler deploy
```

---

## 4. Custom Domain Configuration (Optional)

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **garment-os**.
2. Go to **Settings** > **Triggers** > **Custom Domains**.
3. Add your custom domain (e.g. `erp.yourdomain.com`).
4. Cloudflare will automatically provision SSL/TLS and route both static frontend assets and `/api/*` endpoints under the same origin.

---

## 5. Verification & Rollback

### Verification
1. **Health check**:
   ```bash
   curl https://<your-worker>.workers.dev/health
   # Expected response: {"status":"ok","database":"connected"}
   ```
2. **Frontend check**:
   - Open `https://<your-worker>.workers.dev/` in your browser.
   - You should be automatically routed to the Dashboard (`/pages/dashboard.html`).
   - Open DevTools > Network tab: all API calls hit `https://<your-worker>.workers.dev/api/...` with HTTP 200/201.

### Rollback
Cloudflare maintains instant deployment versioning.
1. List deployments:
   ```powershell
   npx wrangler deployments list
   ```
2. Roll back to a previous deployment:
   ```powershell
   npx wrangler rollback [DEPLOYMENT_ID]
   ```
