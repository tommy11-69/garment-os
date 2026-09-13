// Garment OS — Cloudflare Worker with D1 Database
// No Mongoose, no MongoDB, no TCP connections — pure SQL via D1

// ── Config ──────────────────────────────────────────────────────────
const ALLOWED_TABLES = new Set([
    'customers', 'orders', 'inventory', 'batches',
    'transactions', 'costings', 'shipments', 'quotations', 'vendors'
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

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSafeField(f) {
    return typeof f === 'string' && /^[a-zA-Z0-9_]+$/.test(f.trim()) && !f.startsWith('$');
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
                            // Developer login - use a virtual user ID
                            user = { id: 'dev-admin', type: 'developer' };
                            userType = 'developer';
                        } else {
                            // Check client credentials in database
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
                        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
                        
                        // Store all sessions in the database (both client and developer)
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
                    
                    // Prevent developer users from updating credentials
                    if (session.userId === 'dev-admin') {
                        return json({ error: 'Developer credentials are hardcoded and cannot be changed' }, 403);
                    }
                    
                    const body = await request.json();
                    
                    let updateSql = [];
                    let bindVars = [];

                    if (body.username) {
                        updateSql.push('username = ?');
                        bindVars.push(body.username.trim());
                    }
                    if (body.password) {
                        const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.password));
                        const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                        updateSql.push('password_hash = ?');
                        bindVars.push(hash);
                    }

                    if (updateSql.length > 0) {
                        bindVars.push(session.userId);
                        await env.DB.prepare(`UPDATE users SET ${updateSql.join(', ')} WHERE id = ?`).bind(...bindVars).run();
                        
                        // Log out user completely across all sessions if password changed
                        if (body.password) {
                             await env.DB.prepare('DELETE FROM sessions WHERE userId = ?').bind(session.userId).run();
                        }
                    }

                    return json({ success: true });
                }

                // Normal API handling
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

                    // Search support
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
                        const dataBound = bindValues.length > 0
                            ? dataStmt.bind(...bindValues, limit, offset)
                            : dataStmt.bind(limit, offset);

                        const [countResult, dataResult] = await Promise.all([
                            countBound.first(),
                            dataBound.all()
                        ]);

                        const total = countResult.total;
                        return json({
                            data: dataResult.results.map(r => hydrateRow(table, r)),
                            total,
                            page,
                            totalPages: Math.ceil(total / limit)
                        });
                    }

                    // No pagination — return all
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

                    // Get valid columns for this table
                    const tableInfo = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
                    const validColumns = new Set(tableInfo.results.map(c => c.name));
                    validColumns.delete('_rowid'); // don't insert into autoincrement PK

                    const cols = Object.keys(data).filter(k => validColumns.has(k));
                    const vals = cols.map(k => data[k]);
                    const placeholders = cols.map(() => '?').join(', ');

                    await env.DB.prepare(
                        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
                    ).bind(...vals).run();

                    // Return the inserted row
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
                    delete data.id; // don't update the ID
                    data.updatedAt = new Date().toISOString();

                    // Get valid columns for this table
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

                    const result = await env.DB.prepare(
                        `DELETE FROM ${table} WHERE id = ?`
                    ).bind(id).run();

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
