import { orderStore } from '../stores/OrderStore.js';
import { customerStore } from '../stores/CustomerStore.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Basic setup
    const qs = id => document.getElementById(id);
    
    // Auto-calculate Total Value
    ['co-qty', 'co-price'].forEach(id => {
        qs(id)?.addEventListener('input', () => {
            const q = parseFloat(qs('co-qty').value) || 0;
            const p = parseFloat(qs('co-price').value) || 0;
            qs('co-total-val').textContent = '₹' + (q * p).toLocaleString(undefined, {minimumFractionDigits:2});
        });
    });
    
    // Setup initial default date
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateStr = nextMonth.toISOString().split('T')[0];
    qs('co-date').value = dateStr;
    
    // Populate customers
    await customerStore.loadInitial();
    const customerSelect = qs('co-customer');
    
    const populateCustomers = () => {
        if (!customerSelect) return;
        customerSelect.innerHTML = `
            <option value="">Select Customer...</option>
            <option value="NEW_CUSTOMER">+ Create New Customer</option>
        `;
        customerStore.state.entities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            customerSelect.appendChild(opt);
        });
    };

    populateCustomers();

    if (customerSelect) {
        customerSelect.onchange = (e) => {
            if (e.target.value === 'NEW_CUSTOMER') {
                customerSelect.value = '';
                window.openQuickAddCustomer(async (newCust) => {
                    await customerStore.loadInitial();
                    populateCustomers();
                    customerSelect.value = newCust.id;
                });
            }
        };
    }

    // Save action
    qs('save-order-btn').addEventListener('click', async () => {
        const customerId = qs('co-customer').value;
        const refNo = qs('co-ref').value;
        const garmentType = qs('co-garment').value;
        const gsm = qs('co-gsm').value;
        const color = qs('co-color').value;
        const qty = parseInt(qs('co-qty').value, 10);
        const price = parseFloat(qs('co-price').value);
        const deliveryDate = qs('co-date').value;
        const isExpedited = qs('co-expedited').checked;
        
        // Strict Validation
        if (!customerId || !garmentType || !gsm || !color || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0 || !deliveryDate) {
            showToast('Please fill all required fields correctly', 'error');
            return;
        }

        const customer = customerStore.state.entities.find(c => c.id === customerId);

        try {
            await orderStore.create({
                customerId,
                customerName: customer ? customer.name : 'Unknown',
                referenceNo: refNo,
                garmentType,
                gsm,
                color,
                qty,
                pricePerPc: price,
                value: qty * price,
                deliveryDate,
                isExpedited,
                status: 'Pending',
                progress: 0,
                phases: [
                    { name: 'Dyeing', completed: false },
                    { name: 'Cutting', completed: false },
                    { name: 'Printing/Embroidery', completed: false },
                    { name: 'Stitching', completed: false },
                    { name: 'Checking', completed: false },
                    { name: 'Packing', completed: false }
                ]
            });

            showToast('Order Created Successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 1000);
            
        } catch (err) {
            showToast('Failed to create order', 'error');
        }
    });
});

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const t = document.createElement('div');
    const icon = type === 'error' ? 'error' : 'check_circle';
    const bg = type === 'error' ? 'bg-error text-white' : 'bg-[#008A00] text-white';
    
    t.className = `${bg} px-4 py-3 rounded-xl shadow-lg text-[14px] font-medium flex items-center gap-2 transform transition-all translate-y-[-20px] opacity-0 mb-2 pointer-events-auto`;
    t.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icon}</span> ${message}`;
    container.appendChild(t);
    
    requestAnimationFrame(() => {
        t.classList.remove('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => {
            t.classList.add('opacity-0', 'translate-y-[-20px]');
            setTimeout(() => t.remove(), 300);
        }, 3000);
    });
}
