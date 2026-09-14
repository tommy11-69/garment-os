const BASE_URL = 'http://127.0.0.1:8787';

async function runAttachmentTests() {
    console.log('=== FINANCE ATTACHMENTS AUTOMATED TEST SUITE ===\n');
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

    // 1. Authenticate
    console.log('1. Authentication:');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: '2906' })
    }).then(r => r.json());
    assert(!!loginRes.token, `Logged in successfully, token: ${loginRes.token ? 'YES' : 'NO'}`);
    const token = loginRes.token;

    // 2. Fetch all transactions and verify attachments property is always an array
    console.log('\n2. Schema & Hydration Check:');
    const txns = await fetch(`${BASE_URL}/api/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    assert(Array.isArray(txns), `GET /api/transactions returned array (${txns.length} records)`);
    const allHaveArrayAttachments = txns.every(t => Array.isArray(t.attachments));
    assert(allHaveArrayAttachments, 'Every transaction has attachments hydrated as Array');

    const txWithAtt = txns.find(t => t.attachments && t.attachments.length > 0);
    assert(!!txWithAtt, `Found seeded transaction with attachments: ${txWithAtt?.id} (${txWithAtt?.attachments?.length} files)`);

    // 3. Create a transaction with an attachment
    console.log('\n3. Create Transaction with Attachment (POST):');
    const testTxId = `test-txn-${Date.now()}`;
    const sampleAttachment = {
        id: `att-test-${Date.now()}`,
        name: 'Supplier_Bill_Sept2026.jpg',
        type: 'image/jpeg',
        size: 245000,
        dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        uploadedAt: new Date().toISOString()
    };

    const createPayload = {
        id: testTxId,
        type: 'Expense',
        title: 'Fabric Trim Sourcing & Sample Invoices',
        amount: 34500,
        category: 'Accessories',
        status: 'Completed',
        paymentMethod: 'UPI',
        referenceNo: 'UPI-TEST-99881',
        date: new Date().toISOString().split('T')[0],
        notes: 'Automated test expense for attachment verification',
        attachments: [sampleAttachment]
    };

    const created = await fetch(`${BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload)
    }).then(r => r.json());

    assert(created.id === testTxId, `Transaction created with id ${testTxId}`);
    assert(Array.isArray(created.attachments), 'Created transaction returned attachments array');
    assert(created.attachments.length === 1, `Created transaction has 1 attachment (got ${created.attachments?.length})`);
    assert(created.attachments[0].name === 'Supplier_Bill_Sept2026.jpg', 'Attachment name matches');

    // 4. Retrieve by ID
    console.log('\n4. Retrieve by ID (GET):');
    const fetched = await fetch(`${BASE_URL}/api/transactions/${testTxId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    assert(fetched && fetched.id === testTxId, `GET /api/transactions/${testTxId} successful`);
    assert(Array.isArray(fetched.attachments) && fetched.attachments.length === 1, 'Hydrated attachments on single item lookup');

    // 5. Add second attachment (PDF) via PUT
    console.log('\n5. Update Attachments (PUT):');
    const pdfAttachment = {
        id: `att-test-pdf-${Date.now()}`,
        name: 'Signed_Delivery_Challan.pdf',
        type: 'application/pdf',
        size: 154000,
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
        uploadedAt: new Date().toISOString()
    };

    const updated = await fetch(`${BASE_URL}/api/transactions/${testTxId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            attachments: [...fetched.attachments, pdfAttachment]
        })
    }).then(r => r.json());

    assert(updated.attachments.length === 2, `Updated attachments count is 2 (got ${updated.attachments?.length})`);
    assert(updated.attachments[1].name === 'Signed_Delivery_Challan.pdf', 'Second attachment name matches');

    // 6. Delete one attachment via PUT
    console.log('\n6. Delete Attachment (PUT filtered array):');
    const filtered = updated.attachments.filter(a => a.id !== sampleAttachment.id);
    const afterDelete = await fetch(`${BASE_URL}/api/transactions/${testTxId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: filtered })
    }).then(r => r.json());

    assert(afterDelete.attachments.length === 1, `Remaining attachments count is 1 (got ${afterDelete.attachments?.length})`);
    assert(afterDelete.attachments[0].id === pdfAttachment.id, 'Remaining attachment is the PDF');

    // 7. Cleanup test transaction
    console.log('\n7. Cleanup Test Transaction (DELETE):');
    const delRes = await fetch(`${BASE_URL}/api/transactions/${testTxId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    assert(delRes.success === true, 'Test transaction deleted successfully');

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
}

runAttachmentTests().catch(e => {
    console.error('Test Suite Failed:', e);
    process.exit(1);
});
