const https = require('https');

function request(token, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    let postData = '';
    if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request({
      hostname: 'garment-os.udhayaatextiles.com',
      path,
      method,
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runAudit() {
  console.log('=== 1. Testing Login ===');
  const loginRes = await request(null, 'POST', '/api/auth/login', { username: 'Udhayaa textiles', password: '456' });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('Login successful! Token acquired.\n');

  const tables = ['customers', 'vendors', 'orders', 'inventory', 'batches', 'transactions', 'costings', 'shipments', 'quotations'];
  
  console.log('=== 2. Testing READ on all collections ===');
  for (const table of tables) {
    const res = await request(token, 'GET', '/api/' + table);
    if (res.status === 200 && Array.isArray(res.data)) {
      console.log(`✓ GET /api/${table}: OK (${res.data.length} records)`);
    } else {
      console.error(`✗ GET /api/${table}: FAILED`, res);
    }
  }

  console.log('\n=== 3. Testing SEARCH & PAGINATION ===');
  const searchRes = await request(token, 'GET', '/api/customers?q=Aagam&fields=name,company');
  console.log('Search "Aagam":', searchRes.status === 200 && searchRes.data.length > 0 ? `✓ Found ${searchRes.data.length} matches` : '✗ FAILED ' + JSON.stringify(searchRes));

  const pageRes = await request(token, 'GET', '/api/customers?limit=3&page=1');
  if (pageRes.status === 200 && pageRes.data.data && pageRes.data.data.length === 3) {
    console.log(`✓ Pagination: OK (Page 1 has ${pageRes.data.data.length} items, total: ${pageRes.data.total})`);
  } else {
    console.error('✗ Pagination FAILED:', pageRes);
  }

  console.log('\n=== 4. Testing CRUD (INSERT -> GET by ID -> UPDATE -> DELETE) on each collection ===');
  
  const samplePayloads = {
    customers: { name: 'Audit Test Customer', company: 'Audit Corp', phone: '9999999999', city: 'Coimbatore' },
    vendors: { name: 'Audit Test Vendor', vendorType: 'Fabric', phone: '8888888888' },
    orders: { product: 'Audit Test Polo', qty: 100, unitPrice: 250, status: 'Draft', sizes: ['M', 'L'], timeline: [{ title: 'Created', type: 'status' }] },
    inventory: { name: 'Audit Test Fabric', sku: 'AUD-001', quantity: 50, unit: 'kg' },
    batches: { orderId: 'test-order', description: 'Audit Batch', phase: 'Cutting', progress: 10 },
    transactions: { type: 'Income', amount: 1500, title: 'Audit Test Payment', category: 'Advance', status: 'Completed' },
    costings: { styleRef: 'Audit Style', clientId: 'Audit Client', totalUnitCost: 150, retailPrice: 200, materials: [{ name: 'Yarn', cost: 50 }] },
    shipments: { customerName: 'Audit Customer', courier: 'ST Courier', trackingNo: 'TRK123456', boxes: 2 },
    quotations: { customerId: 'c-test', customerName: 'Audit Customer', date: '2026-09-10', items: [{ name: 'Shirt', qty: 10, rate: 200, total: 2000 }] }
  };

  for (const table of tables) {
    const payload = samplePayloads[table];
    process.stdout.write(`Testing CRUD on [${table}]... `);

    // C: Create
    const createRes = await request(token, 'POST', '/api/' + table, payload);
    if (createRes.status !== 201 || !createRes.data.id) {
      console.log(`\n  ✗ INSERT FAILED for ${table}:`, createRes);
      continue;
    }
    const id = createRes.data.id;

    // R: Read by ID
    const getRes = await request(token, 'GET', `/api/${table}/${id}`);
    if (getRes.status !== 200 || getRes.data.id !== id) {
      console.log(`\n  ✗ GET BY ID FAILED for ${table}:`, getRes);
      continue;
    }

    // U: Update
    const updateRes = await request(token, 'PUT', `/api/${table}/${id}`, { notes: 'Audit Updated' });
    if (updateRes.status !== 200) {
      console.log(`\n  ✗ UPDATE FAILED for ${table}:`, updateRes);
      continue;
    }

    // D: Delete
    const delRes = await request(token, 'DELETE', `/api/${table}/${id}`);
    if (delRes.status !== 200 || !delRes.data.success) {
      console.log(`\n  ✗ DELETE FAILED for ${table}:`, delRes);
      continue;
    }

    // Verify deletion
    const verifyDel = await request(token, 'GET', `/api/${table}/${id}`);
    if (verifyDel.status === 404) {
      console.log('✓ PASS');
    } else {
      console.log('✗ Delete verification failed: item still exists');
    }
  }

  console.log('\n=== 5. Testing Credentials Update Endpoint ===');
  // Only verify endpoint exists / methods
  const badCreds = await request(token, 'GET', '/api/auth/credentials');
  if (badCreds.status === 405) {
    console.log('✓ /api/auth/credentials method check: OK (405 on GET as expected)');
  } else {
    console.log('? /api/auth/credentials status:', badCreds.status);
  }

  console.log('\nAudit complete!');
}

runAudit().catch(err => console.error('Unexpected error:', err));
