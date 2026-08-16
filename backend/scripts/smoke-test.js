/**
 * Garment OS — End-to-End API Smoke Test
 * Tests /health, CRUD across all 8 collections, search sanitization, and error handling.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function fetchJson(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log(`Starting smoke tests against: ${BASE_URL}\n`);
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  [PASS] ${message}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${message}`);
            failed++;
        }
    }

    // 1. Health Check
    console.log('1. Health Endpoint:');
    try {
        const health = await fetchJson('/health');
        assert(health.status === 200, `GET /health status is 200 (got ${health.status})`);
        assert(health.data && health.data.status === 'ok', `GET /health returns { status: "ok" }`);
    } catch (e) {
        assert(false, `GET /health threw error: ${e.message}`);
    }

    // 2. Collection Whitelist Validation
    console.log('\n2. Collection Whitelist Validation:');
    try {
        const invalid = await fetchJson('/api/invalid_secret_collection');
        assert(invalid.status === 404, `GET /api/invalid_secret_collection returns 404 (got ${invalid.status})`);
    } catch (e) {
        assert(false, `Invalid collection threw unexpected error: ${e.message}`);
    }

    // 3. Search Sanitization (ReDoS protection)
    console.log('\n3. Search Sanitization (ReDoS):');
    try {
        const redosQuery = '/api/customers?q=((((((((a%2B)%2B)%2B)%2B)%2B)%2B)%2B)&fields=name';
        const search = await fetchJson(redosQuery);
        assert(search.status === 200, `ReDoS payload safely handled without crashing (status ${search.status})`);
    } catch (e) {
        assert(false, `Search sanitization error: ${e.message}`);
    }

    // 4. Test CRUD for all 8 collections
    const collections = [
        { name: 'customers', sample: { name: 'Test Smoke Corp', email: 'smoke@test.com' } },
        { name: 'orders', sample: { customerName: 'Test Smoke Corp', product: 'Polo T-Shirt', qty: 100 } },
        { name: 'inventory', sample: { name: 'Smoke Fabric Cotton', quantity: 500, unit: 'meters' } },
        { name: 'batches', sample: { description: 'Smoke Batch #1', phase: 'Cutting', progress: 10 } },
        { name: 'transactions', sample: { type: 'Income', amount: 5000, category: 'Order Advance' } },
        { name: 'costings', sample: { styleRef: 'SMOKE-01', totalUnitCost: 250 } },
        { name: 'shipments', sample: { customerName: 'Test Smoke Corp', courier: 'DHL' } },
        { name: 'quotations', sample: { customerId: 'c-smoke', customerName: 'Test Smoke Corp', date: '2026-08-16', totalAmount: 25000, items: [{ name: 'Polo', qty: 100, rate: 250, total: 25000 }] } }
    ];

    console.log('\n4. CRUD Operations Across All 8 Collections:');
    for (const col of collections) {
        try {
            // Create (POST)
            const testId = `test-${col.name}-${Date.now()}`;
            const createRes = await fetchJson(`/api/${col.name}`, {
                method: 'POST',
                body: JSON.stringify({ id: testId, ...col.sample })
            });
            assert(createRes.status === 201 && createRes.data && createRes.data.id === testId, `POST /api/${col.name} creates record`);

            // Read by ID (GET)
            const readRes = await fetchJson(`/api/${col.name}/${testId}`);
            assert(readRes.status === 200 && readRes.data && readRes.data.id === testId, `GET /api/${col.name}/:id fetches record`);

            // Update (PUT)
            const updateRes = await fetchJson(`/api/${col.name}/${testId}`, {
                method: 'PUT',
                body: JSON.stringify({ notes: 'Updated by smoke test' })
            });
            assert(updateRes.status === 200, `PUT /api/${col.name}/:id updates record`);

            // Delete (DELETE)
            const deleteRes = await fetchJson(`/api/${col.name}/${testId}`, {
                method: 'DELETE'
            });
            assert(deleteRes.status === 200 && deleteRes.data && deleteRes.data.success === true, `DELETE /api/${col.name}/:id removes record`);
        } catch (e) {
            assert(false, `CRUD failed for ${col.name}: ${e.message}`);
        }
    }

    console.log(`\n========================================`);
    console.log(`Smoke Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
