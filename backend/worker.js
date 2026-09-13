// Garment OS — Cloudflare Worker with D1 Database
// No Mongoose, no MongoDB, no TCP connections — pure SQL via D1

// ── Config ──────────────────────────────────────────────────────────
const ALLOWED_TABLES = new Set([
    'customers', 'orders', 'inventory', 'batches',
    'transactions', 'costings', 'shipments', 'quotations', 'vendors',
    'billing_master', 'billing_items', 'billing_counters', 'billings'
]);

// Columns that store JSON arrays/objects as TEXT in D1
const JSON_COLUMNS = {
    orders: ['sizes', 'colours', 'timeline', 'tasks', 'expenses', 'activityLog', 'stageData', 'products'],
    batches: ['expenses', 'consumptions'],
    costings: ['materials', 'uData'],
    quotations: ['items'],
    inventory: ['movementHistory', 'specifications']
};

// ── Helpers ─────────────────────────────────────────────────────────
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}

/** Parse JSON TEXT columns back into real arrays/objects */
function hydrateRow(table, row) {
    if (!row) return null;
    const jsonCols = JSON_COLUMNS[table] || [];
    const result = { ...row };
    delete result._rowid; // hide internal PK
    for (const col of jsonCols) {
        if (result[col] && typeof result[col] === 'string') {
            try { result[col] = JSON.parse(result[col]); } catch { /* leave as-is */ }
        }
    }
    // Convert SQLite integer booleans back
    if ('isActive' in result) result.isActive = !!result.isActive;
    if ('showFabric' in result) result.showFabric = !!result.showFabric;
    if ('showColour' in result) result.showColour = !!result.showColour;
    if ('showTax' in result) result.showTax = !!result.showTax;
    if ('isNegative' in result) result.isNegative = !!result.isNegative;
    return result;
}

/** Stringify JSON columns for storage */
function dehydrateData(table, data) {
    const jsonCols = JSON_COLUMNS[table] || [];
    const result = { ...data };
    for (const col of jsonCols) {
        if (result[col] && typeof result[col] !== 'string') {
            result[col] = JSON.stringify(result[col]);
        }
    }
    // Convert booleans to integers for SQLite
    for (const key of ['isActive', 'showFabric', 'showColour', 'showTax', 'isNegative']) {
        if (key in result) result[key] = result[key] ? 1 : 0;
    }
    return result;
}

function isSafeField(f) {
    return typeof f === 'string' && /^[a-zA-Z0-9_]+$/.test(f.trim()) && !f.startsWith('$');
}

// ── Billing Helpers ──────────────────────────────────────────────────

const TYPE_PREFIX_MAP = {
    'Quotation':      'AG-QTY',
    'Sales_Bill':     'AG-INV',
    'Payment_In':     'AG-PIN',
    'Purchase_Bill':  'AG-PBI',
    'Purchase_Order': 'AG-PO',
    'Payment_Out':    'AG-POT',
};

/**
 * Atomically generate the next serial number for a billing document type.
 * Uses SQLite's single-writer guarantee to prevent duplicates.
 */
async function generateSerialNumber(env, transactionType) {
    const year = new Date().getFullYear();
    const prefix = TYPE_PREFIX_MAP[transactionType];
    if (!prefix) throw new Error(`Unknown transaction type: ${transactionType}`);
    const counterId = `${prefix}-${year}`;

    // Atomic upsert + increment
    await env.DB.prepare(
        `INSERT INTO billing_counters (id, last_seq) VALUES (?, 0) ON CONFLICT(id) DO UPDATE SET last_seq = last_seq + 1`
    ).bind(counterId).run();

    const row = await env.DB.prepare(
        `SELECT last_seq FROM billing_counters WHERE id = ?`
    ).bind(counterId).first();

    const seq = row.last_seq;
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * Auto-create billing tables if they don't exist.
 * Called on every billing API request — safe to call repeatedly.
 */
async function ensureBillingTables(env) {
    await env.DB.batch([
        env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS billing_counters (
                id TEXT PRIMARY KEY,
                last_seq INTEGER NOT NULL DEFAULT 0
            )
        `),
        env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS billing_master (
                _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT UNIQUE NOT NULL,
                invoice_number TEXT UNIQUE NOT NULL,
                transaction_type TEXT NOT NULL,
                contact_id TEXT NOT NULL,
                contact_type TEXT NOT NULL DEFAULT 'customer',
                contact_name TEXT NOT NULL DEFAULT '',
                contact_gstin TEXT DEFAULT '',
                date TEXT NOT NULL,
                due_date TEXT DEFAULT '',
                subtotal REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                tax_total REAL DEFAULT 0,
                grand_total REAL DEFAULT 0,
                amount_paid REAL DEFAULT 0,
                status TEXT DEFAULT 'Draft',
                notes TEXT DEFAULT '',
                linked_bill_id TEXT DEFAULT '',
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            )
        `),
        env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS billing_items (
                _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT UNIQUE NOT NULL,
                billing_master_id TEXT NOT NULL,
                item_name TEXT NOT NULL DEFAULT '',
                item_id TEXT DEFAULT '',
                description TEXT DEFAULT '',
                quantity REAL DEFAULT 1,
                unit TEXT DEFAULT 'pcs',
                unit_price REAL DEFAULT 0,
                discount_pct REAL DEFAULT 0,
                tax_pct REAL DEFAULT 0,
                tax_amount REAL DEFAULT 0,
                row_total REAL DEFAULT 0,
                createdAt TEXT DEFAULT (datetime('now'))
            )
        `)
    ]);
}

/** Fetch a billing document by id with all its line items */
async function getBillingWithItems(env, id) {
    const master = await env.DB.prepare(
        `SELECT * FROM billing_master WHERE id = ?`
    ).bind(id).first();
    if (!master) return null;

    delete master._rowid;

    const itemsResult = await env.DB.prepare(
        `SELECT * FROM billing_items WHERE billing_master_id = ? ORDER BY _rowid ASC`
    ).bind(id).all();

    const items = itemsResult.results.map(r => { delete r._rowid; return r; });
    return { ...master, items };
}

/** Apply business logic triggers when a billing document is finalized */
async function applyFinalizeTriggers(env, billing) {
    const { transaction_type, id, items = [], grand_total, linked_bill_id, contact_id } = billing;

    if (transaction_type === 'Sales_Bill') {
        // Decrement inventory stock for each linked item
        for (const item of items) {
            if (item.item_id && item.quantity > 0) {
                await env.DB.prepare(
                    `UPDATE inventory SET quantity = MAX(0, quantity - ?), updatedAt = datetime('now') WHERE id = ?`
                ).bind(item.quantity, item.item_id).run();
                // Update stock status
                const invRow = await env.DB.prepare(`SELECT quantity, minStock FROM inventory WHERE id = ?`).bind(item.item_id).first();
                if (invRow) {
                    const newStatus = invRow.quantity <= 0 ? 'Out of Stock' : invRow.quantity <= (invRow.minStock || 50) ? 'Low Stock' : 'In Stock';
                    await env.DB.prepare(`UPDATE inventory SET status = ? WHERE id = ?`).bind(newStatus, item.item_id).run();
                }
            }
        }
    }

    if (transaction_type === 'Purchase_Bill') {
        // Increment inventory stock for each linked item
        for (const item of items) {
            if (item.item_id && item.quantity > 0) {
                await env.DB.prepare(
                    `UPDATE inventory SET quantity = quantity + ?, updatedAt = datetime('now') WHERE id = ?`
                ).bind(item.quantity, item.item_id).run();
                // Update stock status
                const invRow = await env.DB.prepare(`SELECT quantity, minStock FROM inventory WHERE id = ?`).bind(item.item_id).first();
                if (invRow) {
                    const newStatus = invRow.quantity <= 0 ? 'Out of Stock' : invRow.quantity <= (invRow.minStock || 50) ? 'Low Stock' : 'In Stock';
                    await env.DB.prepare(`UPDATE inventory SET status = ? WHERE id = ?`).bind(newStatus, item.item_id).run();
                }
            }
        }
    }

    if (transaction_type === 'Payment_In' && linked_bill_id) {
        // Apply payment to the linked Sales Bill
        const linkedBill = await env.DB.prepare(
            `SELECT grand_total, amount_paid FROM billing_master WHERE id = ?`
        ).bind(linked_bill_id).first();

        if (linkedBill) {
            const newAmountPaid = (linkedBill.amount_paid || 0) + grand_total;
            const remaining = linkedBill.grand_total - newAmountPaid;
            const invoiceStatus = remaining <= 0.01 ? 'Paid' : 'Partially_Paid';
            await env.DB.prepare(
                `UPDATE billing_master SET amount_paid = ?, status = ?, updatedAt = datetime('now') WHERE id = ?`
            ).bind(newAmountPaid, invoiceStatus, linked_bill_id).run();
        }
    }

    if (transaction_type === 'Payment_Out' && linked_bill_id) {
        // Apply payment to the linked Purchase Bill
        const linkedBill = await env.DB.prepare(
            `SELECT grand_total, amount_paid FROM billing_master WHERE id = ?`
        ).bind(linked_bill_id).first();

        if (linkedBill) {
            const newAmountPaid = (linkedBill.amount_paid || 0) + grand_total;
            const remaining = linkedBill.grand_total - newAmountPaid;
            const billStatus = remaining <= 0.01 ? 'Paid' : 'Partially_Paid';
            await env.DB.prepare(
                `UPDATE billing_master SET amount_paid = ?, status = ?, updatedAt = datetime('now') WHERE id = ?`
            ).bind(newAmountPaid, billStatus, linked_bill_id).run();
        }
    }
}

// ── Worker Entry ────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Health check
        if (url.pathname === '/health' || url.pathname === '/api/health') {
            try {
                await env.DB.prepare('SELECT 1').first();
                return json({ status: 'ok', database: 'connected', engine: 'D1' });
            } catch (e) {
                return json({ status: 'error', database: 'disconnected', error: e.message }, 500);
            }
        }

        // Telemetry endpoint
        if (url.pathname === '/api/telemetry/dashboard' || url.pathname === '/api/telemetry') {
            try {
                await ensureBillingTables(env);
                const salesResult = await env.DB.prepare(
                    `SELECT SUM(grand_total) as total FROM billing_master WHERE transaction_type = 'Sales_Bill' AND status != 'Void'`
                ).first();
                const purchaseResult = await env.DB.prepare(
                    `SELECT SUM(grand_total) as total FROM billing_master WHERE transaction_type IN ('Purchase_Bill','Payment_Out') AND status != 'Void'`
                ).first();
                const quotesResult = await env.DB.prepare(
                    `SELECT COUNT(*) as count FROM billing_master WHERE transaction_type = 'Quotation' AND status != 'Void'`
                ).first();
                const invResult = await env.DB.prepare(
                    `SELECT SUM(totalValue) as total FROM inventory WHERE isActive = 1`
                ).first();

                const statusCounts = {
                    'Draft': 0, 'Quotation Sent': 0, 'Awaiting Approval': 0, 'Approved': 0,
                    'Material Reserved': 0, 'Production Assigned': 0, 'Knitting': 0,
                    'Cutting': 0, 'Stitching': 0, 'QC Audit': 0, 'Dispatched': 0, 'Fulfilled': 0
                };
                const ordersResult = await env.DB.prepare(`SELECT status, COUNT(*) as cnt FROM orders GROUP BY status`).all();
                if (ordersResult.results) {
                    for (const r of ordersResult.results) {
                        if (statusCounts[r.status] !== undefined) statusCounts[r.status] = r.cnt;
                    }
                }

                const salesTotal = salesResult?.total || 0;
                const purchasesTotal = purchaseResult?.total || 0;
                const quotesCount = quotesResult?.count || 0;
                const inventoryTotalValue = invResult?.total || 0;

                const anomalies = [];
                if (inventoryTotalValue > 500000) {
                    anomalies.push({
                        id: 'anom-1',
                        metric: 'High Inventory Holding',
                        currentValue: '₹' + Math.round(inventoryTotalValue).toLocaleString(),
                        severity: 'MEDIUM',
                        message: 'Total fabric & SKU holding value is above baseline threshold.'
                    });
                }

                return json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    metrics: {
                        totalSales: salesTotal,
                        totalExpenses: purchasesTotal,
                        quotationsCount: quotesCount,
                        inventoryValue: inventoryTotalValue,
                        activeOrders: Object.values(statusCounts).reduce((a, b) => a + b, 0) - (statusCounts['Fulfilled'] || 0)
                    },
                    matrix: statusCounts,
                    anomalies
                });
            } catch (e) {
                return json({ error: e.message }, 500);
            }
        }

        // API routes
        if (url.pathname.startsWith('/api/')) {
            try {
                // Auth Login Endpoint
                if (url.pathname === '/api/auth/login') {
                    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
                    
                    try {
                        let body;
                        try {
                            body = await request.json();
                        } catch (e) {
                            return json({ error: 'Invalid JSON payload' }, 400);
                        }
                        
                        if (!body.username || !body.password) {
                            return json({ error: 'Username and password required' }, 400);
                        }

                        let user = null;
                        let userType = null;

                        // Check for developer/admin hardcoded credentials first
                        if (body.username === 'admin' && body.password === '2906') {
                            user = { id: 'dev-admin', type: 'developer' };
                            userType = 'developer';
                        } else {
                            const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.password));
                            const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                            const dbUser = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND password_hash = ?')
                                .bind(body.username, hash).first();
                            if (dbUser) {
                                user = dbUser;
                                userType = 'client';
                            }
                        }

                        if (!user) return json({ error: 'Invalid credentials' }, 401);

                        const token = crypto.randomUUID();
                        const expiresAt = Date.now() + (60 * 60 * 1000);
                        await env.DB.prepare('INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)')
                            .bind(token, user.id, expiresAt).run();
                        return json({ success: true, token, userId: user.id, userType });
                    } catch (loginError) {
                        console.error('Login error:', loginError);
                        return json({ error: 'Authentication service error: ' + loginError.message }, 500);
                    }
                }

                // Auth Middleware for all other API routes
                const authHeader = request.headers.get('Authorization');
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return json({ error: 'Unauthorized: No token provided' }, 401);
                }
                const token = authHeader.split(' ')[1];
                const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?')
                    .bind(token, Date.now()).first();
                if (!session) {
                    return json({ error: 'Unauthorized: Invalid or expired token' }, 401);
                }

                // Auth Credentials Update Endpoint
                if (url.pathname === '/api/auth/credentials') {
                    if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);
                    if (session.userId === 'dev-admin') {
                        return json({ error: 'Developer credentials are hardcoded and cannot be changed' }, 403);
                    }
                    const body = await request.json();
                    let updateSql = [];
                    let bindVars = [];
                    if (body.username) { updateSql.push('username = ?'); bindVars.push(body.username.trim()); }
                    if (body.password) {
                        const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.password));
                        const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                        updateSql.push('password_hash = ?'); bindVars.push(hash);
                    }
                    if (updateSql.length > 0) {
                        bindVars.push(session.userId);
                        await env.DB.prepare(`UPDATE users SET ${updateSql.join(', ')} WHERE id = ?`).bind(...bindVars).run();
                        if (body.password) {
                            await env.DB.prepare('DELETE FROM sessions WHERE userId = ?').bind(session.userId).run();
                        }
                    }
                    return json({ success: true });
                }

                // ── BILLINGS ROUTES (custom, before generic CRUD) ────────
                if (url.pathname.startsWith('/api/billings')) {
                    await ensureBillingTables(env);

                    const billingParts = url.pathname.replace('/api/billings', '').split('/').filter(Boolean);
                    const billingId = billingParts[0] || null;
                    const action = billingParts[1] || null; // 'finalize' | 'convert' | 'items'

                    // GET /api/billings/stats
                    if (request.method === 'GET' && billingId === 'stats') {
                        const types = Object.keys(TYPE_PREFIX_MAP);
                        const stats = {};
                        for (const t of types) {
                            const row = await env.DB.prepare(
                                `SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total FROM billing_master WHERE transaction_type = ?`
                            ).bind(t).first();
                            stats[t] = { count: row.count, total: row.total };
                        }
                        const receivable = await env.DB.prepare(
                            `SELECT COALESCE(SUM(grand_total - amount_paid), 0) as total FROM billing_master WHERE transaction_type = 'Sales_Bill' AND status NOT IN ('Paid', 'Void')`
                        ).first();
                        const payable = await env.DB.prepare(
                            `SELECT COALESCE(SUM(grand_total - amount_paid), 0) as total FROM billing_master WHERE transaction_type = 'Purchase_Bill' AND status NOT IN ('Paid', 'Void')`
                        ).first();
                        return json({ byType: stats, totalReceivable: receivable.total, totalPayable: payable.total });
                    }

                    // GET /api/billings or GET /api/billings?type=...
                    if (request.method === 'GET' && !billingId) {
                        const typeFilter = url.searchParams.get('type');
                        const statusFilter = url.searchParams.get('status');
                        const contactFilter = url.searchParams.get('contactId');
                        const q = url.searchParams.get('q');

                        let where = [];
                        let binds = [];

                        if (typeFilter) { where.push('transaction_type = ?'); binds.push(typeFilter); }
                        if (statusFilter) { where.push('status = ?'); binds.push(statusFilter); }
                        if (contactFilter) { where.push('contact_id = ?'); binds.push(contactFilter); }
                        if (q) {
                            where.push('(invoice_number LIKE ? OR contact_name LIKE ? OR notes LIKE ?)');
                            binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
                        }

                        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
                        const stmt = env.DB.prepare(
                            `SELECT * FROM billing_master ${whereClause} ORDER BY date DESC, invoice_number DESC`
                        );
                        const bound = binds.length > 0 ? stmt.bind(...binds) : stmt;
                        const result = await bound.all();
                        const docs = result.results.map(r => { delete r._rowid; return r; });
                        return json(docs);
                    }

                    // GET /api/billings/:id
                    if (request.method === 'GET' && billingId && !action) {
                        const doc = await getBillingWithItems(env, billingId);
                        if (!doc) return json({ error: 'Billing document not found' }, 404);
                        return json(doc);
                    }

                    // POST /api/billings — create new billing document
                    if (request.method === 'POST' && !billingId) {
                        const body = await request.json().catch(() => ({}));

                        if (!body.transaction_type) return json({ error: 'transaction_type is required' }, 400);
                        if (!body.contact_id) return json({ error: 'contact_id is required' }, 400);
                        if (!body.date) return json({ error: 'date is required' }, 400);

                        const invoiceNumber = await generateSerialNumber(env, body.transaction_type);
                        const id = `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                        const now = new Date().toISOString();

                        // Insert master record
                        await env.DB.prepare(`
                            INSERT INTO billing_master (
                                id, invoice_number, transaction_type, contact_id, contact_type,
                                contact_name, contact_gstin, date, due_date,
                                subtotal, discount, tax_total, grand_total, amount_paid,
                                status, notes, linked_bill_id, createdAt, updatedAt
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).bind(
                            id, invoiceNumber, body.transaction_type, body.contact_id,
                            body.contact_type || 'customer', body.contact_name || '',
                            body.contact_gstin || '', body.date, body.due_date || '',
                            body.subtotal || 0, body.discount || 0, body.tax_total || 0,
                            body.grand_total || 0, 0, body.status || 'Draft',
                            body.notes || '', body.linked_bill_id || '', now, now
                        ).run();

                        // Insert line items
                        const items = Array.isArray(body.items) ? body.items : [];
                        for (const item of items) {
                            const itemId = `bitem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                            await env.DB.prepare(`
                                INSERT INTO billing_items (
                                    id, billing_master_id, item_name, item_id, description,
                                    quantity, unit, unit_price, discount_pct, tax_pct, tax_amount, row_total, createdAt
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                itemId, id, item.item_name || '', item.item_id || '',
                                item.description || '', item.quantity || 1,
                                item.unit || 'pcs', item.unit_price || 0,
                                item.discount_pct || 0, item.tax_pct || 0,
                                item.tax_amount || 0, item.row_total || 0, now
                            ).run();
                        }

                        // If status is Finalized immediately, apply triggers
                        if ((body.status || 'Draft') === 'Finalized') {
                            const fullDoc = await getBillingWithItems(env, id);
                            await applyFinalizeTriggers(env, fullDoc);
                        }

                        const created = await getBillingWithItems(env, id);
                        return json(created, 201);
                    }

                    // PUT /api/billings/:id — update master (not items)
                    if (request.method === 'PUT' && billingId && !action) {
                        const existing = await env.DB.prepare(`SELECT * FROM billing_master WHERE id = ?`).bind(billingId).first();
                        if (!existing) return json({ error: 'Billing document not found' }, 404);

                        const body = await request.json().catch(() => ({}));
                        const now = new Date().toISOString();

                        const allowed = ['contact_id','contact_type','contact_name','contact_gstin','date','due_date',
                            'subtotal','discount','tax_total','grand_total','status','notes','linked_bill_id'];
                        const updates = [];
                        const vals = [];
                        for (const key of allowed) {
                            if (key in body) { updates.push(`${key} = ?`); vals.push(body[key]); }
                        }
                        if (updates.length === 0) return json({ error: 'No valid fields to update' }, 400);
                        updates.push('updatedAt = ?'); vals.push(now);
                        vals.push(billingId);

                        await env.DB.prepare(`UPDATE billing_master SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();

                        // If items array provided, replace all items
                        if (Array.isArray(body.items)) {
                            await env.DB.prepare(`DELETE FROM billing_items WHERE billing_master_id = ?`).bind(billingId).run();
                            for (const item of body.items) {
                                const itemId = `bitem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                                await env.DB.prepare(`
                                    INSERT INTO billing_items (
                                        id, billing_master_id, item_name, item_id, description,
                                        quantity, unit, unit_price, discount_pct, tax_pct, tax_amount, row_total, createdAt
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `).bind(
                                    itemId, billingId, item.item_name || '', item.item_id || '',
                                    item.description || '', item.quantity || 1,
                                    item.unit || 'pcs', item.unit_price || 0,
                                    item.discount_pct || 0, item.tax_pct || 0,
                                    item.tax_amount || 0, item.row_total || 0, now
                                ).run();
                            }
                        }

                        const updated = await getBillingWithItems(env, billingId);
                        return json(updated);
                    }

                    // POST /api/billings/:id/finalize
                    if (request.method === 'POST' && billingId && action === 'finalize') {
                        const existing = await env.DB.prepare(`SELECT status FROM billing_master WHERE id = ?`).bind(billingId).first();
                        if (!existing) return json({ error: 'Billing document not found' }, 404);
                        if (existing.status === 'Finalized') return json({ error: 'Already finalized' }, 400);
                        if (existing.status === 'Void') return json({ error: 'Cannot finalize a voided document' }, 400);

                        await env.DB.prepare(
                            `UPDATE billing_master SET status = 'Finalized', updatedAt = datetime('now') WHERE id = ?`
                        ).bind(billingId).run();

                        const fullDoc = await getBillingWithItems(env, billingId);
                        await applyFinalizeTriggers(env, fullDoc);

                        return json(fullDoc);
                    }

                    // POST /api/billings/:id/convert — Quotation → Sales Bill
                    if (request.method === 'POST' && billingId && action === 'convert') {
                        const original = await getBillingWithItems(env, billingId);
                        if (!original) return json({ error: 'Billing document not found' }, 404);
                        if (original.transaction_type !== 'Quotation') return json({ error: 'Only Quotations can be converted' }, 400);

                        const invoiceNumber = await generateSerialNumber(env, 'Sales_Bill');
                        const newId = `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                        const now = new Date().toISOString();
                        const today = new Date().toISOString().split('T')[0];

                        await env.DB.prepare(`
                            INSERT INTO billing_master (
                                id, invoice_number, transaction_type, contact_id, contact_type,
                                contact_name, contact_gstin, date, due_date,
                                subtotal, discount, tax_total, grand_total, amount_paid,
                                status, notes, linked_bill_id, createdAt, updatedAt
                            ) VALUES (?, ?, 'Sales_Bill', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Draft', ?, ?, ?, ?)
                        `).bind(
                            newId, invoiceNumber, original.contact_id, original.contact_type,
                            original.contact_name, original.contact_gstin, today, original.due_date || '',
                            original.subtotal, original.discount, original.tax_total, original.grand_total,
                            original.notes || '', billingId, now, now
                        ).run();

                        // Clone all line items
                        for (const item of (original.items || [])) {
                            const itemId = `bitem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                            await env.DB.prepare(`
                                INSERT INTO billing_items (
                                    id, billing_master_id, item_name, item_id, description,
                                    quantity, unit, unit_price, discount_pct, tax_pct, tax_amount, row_total, createdAt
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                itemId, newId, item.item_name, item.item_id || '',
                                item.description || '', item.quantity, item.unit || 'pcs',
                                item.unit_price, item.discount_pct || 0, item.tax_pct || 0,
                                item.tax_amount || 0, item.row_total, now
                            ).run();
                        }

                        // Mark original quotation as Converted
                        await env.DB.prepare(
                            `UPDATE billing_master SET status = 'Converted', updatedAt = datetime('now') WHERE id = ?`
                        ).bind(billingId).run();

                        const created = await getBillingWithItems(env, newId);
                        return json(created, 201);
                    }

                    // DELETE /api/billings/:id — void (soft delete)
                    if (request.method === 'DELETE' && billingId) {
                        const existing = await env.DB.prepare(`SELECT id FROM billing_master WHERE id = ?`).bind(billingId).first();
                        if (!existing) return json({ error: 'Billing document not found' }, 404);
                        await env.DB.prepare(
                            `UPDATE billing_master SET status = 'Void', updatedAt = datetime('now') WHERE id = ?`
                        ).bind(billingId).run();
                        return json({ success: true, message: 'Document voided' });
                    }

                    return json({ error: 'Invalid billing endpoint' }, 404);
                }

                // ── Generic CRUD ─────────────────────────────────────────
                const parts = url.pathname.replace(/^\/api\//, '').split('/');
                const table = parts[0];
                const id = parts[1] ? decodeURIComponent(parts[1]) : null;

                if (!ALLOWED_TABLES.has(table)) {
                    return json({ error: 'Collection not found' }, 404);
                }

                // Auto-migrate inventory columns if missing
                if (table === 'inventory') {
                    try {
                        const tableInfo = await env.DB.prepare(`PRAGMA table_info(inventory)`).all();
                        const existing = new Set(tableInfo.results.map(c => c.name));
                        const needed = [
                            ['category', "TEXT DEFAULT 'Fabric'"],
                            ['subCategory', "TEXT DEFAULT ''"],
                            ['costPrice', "REAL DEFAULT 0"],
                            ['totalValue', "REAL DEFAULT 0"],
                            ['minStock', "REAL DEFAULT 0"],
                            ['location', "TEXT DEFAULT ''"],
                            ['supplier', "TEXT DEFAULT ''"],
                            ['supplierId', "TEXT DEFAULT ''"],
                            ['color', "TEXT DEFAULT ''"],
                            ['specifications', "TEXT DEFAULT '{}'"],
                            ['notes', "TEXT DEFAULT ''"],
                            ['movementHistory', "TEXT DEFAULT '[]'"]
                        ];
                        for (const [col, typeDef] of needed) {
                            if (!existing.has(col)) {
                                await env.DB.prepare(`ALTER TABLE inventory ADD COLUMN ${col} ${typeDef}`).run().catch(() => {});
                            }
                        }
                    } catch (e) { /* ignore */ }
                }

                // ── GET ─────────────────────────────────────────
                if (request.method === 'GET') {
                    if (id) {
                        const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
                        if (!row) return json({ error: 'Item not found' }, 404);
                        return json(hydrateRow(table, row));
                    }

                    const q = url.searchParams.get('q');
                    const fields = url.searchParams.get('fields');
                    const limit = parseInt(url.searchParams.get('limit'), 10);
                    const page = parseInt(url.searchParams.get('page'), 10) || 1;

                    let whereClause = '';
                    let bindValues = [];

                    if (q && fields) {
                        const safeFields = fields.split(',').map(f => f.trim()).filter(isSafeField);
                        if (safeFields.length > 0) {
                            const conditions = safeFields.map(f => `${f} LIKE ?`);
                            whereClause = `WHERE ${conditions.join(' OR ')}`;
                            bindValues = safeFields.map(() => `%${q}%`);
                        }
                    }

                    if (limit > 0) {
                        const offset = (page - 1) * limit;
                        const countStmt = env.DB.prepare(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`);
                        const dataStmt = env.DB.prepare(`SELECT * FROM ${table} ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`);
                        const countBound = bindValues.length > 0 ? countStmt.bind(...bindValues) : countStmt;
                        const dataBound = bindValues.length > 0 ? dataStmt.bind(...bindValues, limit, offset) : dataStmt.bind(limit, offset);
                        const [countResult, dataResult] = await Promise.all([countBound.first(), dataBound.all()]);
                        const total = countResult.total;
                        return json({ data: dataResult.results.map(r => hydrateRow(table, r)), total, page, totalPages: Math.ceil(total / limit) });
                    }

                    const stmt = env.DB.prepare(`SELECT * FROM ${table} ${whereClause} ORDER BY createdAt DESC`);
                    const bound = bindValues.length > 0 ? stmt.bind(...bindValues) : stmt;
                    const result = await bound.all();
                    return json(result.results.map(r => hydrateRow(table, r)));
                }

                // ── POST ────────────────────────────────────────
                if (request.method === 'POST') {
                    const body = await request.json().catch(() => ({}));
                    const data = dehydrateData(table, body);
                    if (!data.id) data.id = `${table.charAt(0)}-${Date.now()}`;
                    delete data._id;
                    delete data._rowid;

                    const now = new Date().toISOString();
                    data.createdAt = now;
                    data.updatedAt = now;

                    const tableInfo = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
                    const validColumns = new Set(tableInfo.results.map(c => c.name));
                    validColumns.delete('_rowid');

                    const cols = Object.keys(data).filter(k => validColumns.has(k));
                    const vals = cols.map(k => data[k]);
                    const placeholders = cols.map(() => '?').join(', ');

                    await env.DB.prepare(
                        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
                    ).bind(...vals).run();

                    const inserted = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(data.id).first();
                    return json(hydrateRow(table, inserted), 201);
                }

                // ── PUT ─────────────────────────────────────────
                if (request.method === 'PUT') {
                    if (!id) return json({ error: 'ID required' }, 400);

                    const body = await request.json().catch(() => ({}));
                    const data = dehydrateData(table, body);
                    delete data._id;
                    delete data._rowid;
                    delete data.id;
                    data.updatedAt = new Date().toISOString();

                    const tableInfo = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
                    const validColumns = new Set(tableInfo.results.map(c => c.name));
                    validColumns.delete('_rowid');

                    const cols = Object.keys(data).filter(k => validColumns.has(k));
                    if (cols.length === 0) return json({ error: 'No valid fields to update' }, 400);

                    const setClause = cols.map(k => `${k} = ?`).join(', ');
                    const vals = cols.map(k => data[k]);

                    await env.DB.prepare(
                        `UPDATE ${table} SET ${setClause} WHERE id = ?`
                    ).bind(...vals, id).run();

                    const updated = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
                    if (!updated) return json({ error: 'Item not found' }, 404);
                    return json(hydrateRow(table, updated));
                }

                // ── DELETE ──────────────────────────────────────
                if (request.method === 'DELETE') {
                    if (!id) return json({ error: 'ID required' }, 400);
                    const result = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
                    if (result.meta.changes === 0) return json({ error: 'Item not found' }, 404);
                    return json({ success: true });
                }

                return json({ error: 'Method not allowed' }, 405);
            } catch (err) {
                console.error('API error:', err);
                return json({ error: err.message || 'Internal error' }, 500);
            }
        }

        // Static assets
        if (env && env.ASSETS) return env.ASSETS.fetch(request);
        return new Response('Not Found', { status: 404 });
    }
};
