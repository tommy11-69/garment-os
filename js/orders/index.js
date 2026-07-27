import { api } from '../services/api.js';
import { renderers } from '../renderers.js';
import { SegmentedControl, BottomSheet, TimelineEvent } from '../components/index.js';
import { TextInput, SelectInput, TextareaInput } from '../components/inputs.js';
import { bindFormValidation } from '../utils/formHandler.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Segmented Control
    const segControl = document.getElementById('orders-segmented-control');
    if (segControl) {
        segControl.innerHTML = SegmentedControl({
            options: [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'delayed', label: 'Delayed' }
            ],
            activeOption: 'all'
        });
    }

    // 2. Load Orders List
    const container = document.getElementById('orders-list');
    if (container) {
        if (window.setLoading) {
            window.setLoading('orders-list');
        } else {
            container.innerHTML = '<div class="p-md text-center text-secondary">Loading...</div>';
        }
        
        try {
            const orders = await api.getOrders();
            container.innerHTML = orders.map(o => renderers.orderCard(o)).join('');
        } catch (error) {
            container.innerHTML = '<div class="p-md text-center text-error">Failed to load orders</div>';
            console.error(error);
        }
    }

    // 3. Setup Bottom Sheets
    const sheetsContainer = document.getElementById('sheets-container');
    if (!sheetsContainer) return;

    const priorityControl = (active = 'Normal') => `
        <div class="flex flex-col gap-2">
            <label class="text-[14px] font-semibold text-on-surface">Order Priority</label>
            <div class="flex bg-surface-variant p-1 rounded-xl w-full">
                <button type="button" class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-apple ${active === 'Normal' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-secondary'}">Normal</button>
                <button type="button" class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-apple ${active === 'High' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-secondary'}">High</button>
                <button type="button" class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-apple ${active === 'Urgent' ? 'bg-surface-container-lowest shadow-sm text-error' : 'text-secondary hover:text-error'}">Urgent</button>
            </div>
        </div>
    `;

    // Create Order Content
    const createOrderContent = `
        ${SelectInput({ label: 'Customer', id: 'create-customer', options: [{label: '', value: ''}, {label: 'Everlane Corp.'}, {label: 'Patagonia'}, {label: 'Aethereal Collective'}], required: true })}
        ${SelectInput({ label: 'Product Selection', id: 'create-product', options: [{label: '', value: ''}, {label: 'SS24-TS-01 (Cotton Jersey)'}, {label: 'AW25-JK-02 (Denim Jacket)'}], required: true })}
        <div class="flex gap-4">
            <div class="flex-1">
                ${TextInput({ label: 'Quantity', id: 'create-qty', type: 'number', placeholder: '1000', required: true, validationType: 'positive', min: '1' })}
            </div>
            <div class="flex-1">
                ${TextInput({ label: 'Unit Price', id: 'create-price', type: 'number', placeholder: '$', required: true, validationType: 'non-negative', min: '0', step: '0.01' })}
            </div>
        </div>
        ${TextInput({ label: 'Delivery Date', id: 'create-date', type: 'date', required: true, validationType: 'future-date' })}
        ${priorityControl('Normal')}
        ${TextareaInput({ label: 'Notes', id: 'create-notes', placeholder: 'Any special instructions...', rows: 2 })}
        <div class="h-10"></div>
    `;
    const createOrderFooter = `
        <button id="create-order-submit" onclick="closeSheet('createOrderSheet'); window.showToast('Order created', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Create Order
        </button>
    `;

    // Edit Order Content
    const editOrderContent = `
        ${SelectInput({ label: 'Customer', id: 'edit-customer', options: [{label: 'Everlane Corp.', value: 'Everlane Corp.'}], required: true })}
        ${SelectInput({ label: 'Product Selection', id: 'edit-product', options: [{label: 'SS24-TS-01 (Cotton Jersey)'}], required: true })}
        <div class="flex gap-4">
            <div class="flex-1">
                ${TextInput({ label: 'Quantity', id: 'edit-qty', type: 'number', value: '1200', required: true, validationType: 'positive', min: '1' })}
            </div>
            <div class="flex-1">
                ${TextInput({ label: 'Unit Price', id: 'edit-price', type: 'number', value: '10.33', required: true, validationType: 'non-negative', min: '0', step: '0.01' })}
            </div>
        </div>
        ${TextInput({ label: 'Delivery Date', id: 'edit-date', type: 'date', value: '2026-10-24', required: true, validationType: 'future-date' })}
        ${priorityControl('High')}
        ${TextareaInput({ label: 'Notes', id: 'edit-notes', value: 'Expedited shipping requested.', rows: 2 })}
        <div class="h-10"></div>
    `;
    const editOrderFooter = `
        <button id="edit-order-submit" onclick="closeSheet('editOrderSheet'); window.showToast('Order updated', 'success')" class="w-full bg-primary text-on-primary font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm">
            Save Changes
        </button>
    `;

    // Order Details Content with Quoted vs Actual Cost
    const orderDetailsHeader = `
    <div class="px-lg pb-md flex justify-between items-start border-b border-outline-variant/30">
        <div>
            <span class="text-[13px] font-bold text-primary mb-1 block">ORD-992</span>
            <h2 class="text-[22px] font-bold text-on-surface leading-tight">Everlane Corp.</h2>
            <span class="inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-medium bg-success-container/30 text-success">On Track</span>
        </div>
        <div class="flex gap-2">
            <button onclick="openSheet('editOrderSheet')" class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active-scale transition-apple">
                <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="window.showConfirmation({title: 'Delete Order ORD-992?', message: 'Are you sure you want to delete this order? This action cannot be undone.', confirmText: 'Delete', onConfirm: () => closeSheet('orderDetailsSheet')})" class="w-8 h-8 rounded-full bg-error-container/30 flex items-center justify-center text-error active-scale transition-apple">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button onclick="closeSheet('orderDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        </div>
    </div>`;
    const orderDetailsContent = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm flex flex-col justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Quoted Price</span>
                <span class="text-[20px] font-bold text-on-surface">$12,400</span>
            </div>
            <div class="bg-surface-container-lowest p-4 rounded-[20px] border border-outline-variant shadow-sm flex flex-col justify-between">
                <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Incurred Cost</span>
                <span class="text-[20px] font-bold text-error">$4,500</span>
                <span class="text-[11px] font-medium text-secondary mt-1">From Batch Expenses</span>
            </div>
        </div>

        <div class="bg-surface-container-lowest rounded-[24px] border border-outline-variant shadow-sm p-lg">
            <h3 class="text-[16px] font-bold text-on-surface mb-4">Production Timeline</h3>
            <div class="relative border-l-2 border-outline-variant ml-3 space-y-6">
                ${TimelineEvent({ title: 'Sourcing Completed', time: 'Oct 10', isCompleted: true })}
                ${TimelineEvent({ title: 'Cutting Phase', subtitle: '65% completed. Expected finish by tomorrow.', time: 'In Progress', isActive: true })}
                ${TimelineEvent({ title: 'Sewing Phase' })}
                ${TimelineEvent({ title: 'Quality Control' })}
            </div>
        </div>
        <div class="h-10"></div>
    `;
    const orderDetailsFooter = `
        <button onclick="closeSheet('orderDetailsSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple">
            Close
        </button>
        <button class="flex-1 bg-success text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm">
            Update Status
        </button>
    `;

    // Render Sheets
    sheetsContainer.innerHTML = [
        BottomSheet({ id: 'createOrderSheet', title: 'Create Order', content: createOrderContent, footerContent: createOrderFooter, isForm: true }),
        BottomSheet({ id: 'editOrderSheet', title: 'Edit Order', content: editOrderContent, footerContent: editOrderFooter, isForm: true }),
        BottomSheet({ id: 'orderDetailsSheet', customHeader: orderDetailsHeader, content: orderDetailsContent, footerContent: orderDetailsFooter, height: '90vh' })
    ].join('');

    // Bind validation
    bindFormValidation('createOrderSheet-content', 'create-order-submit');
    bindFormValidation('editOrderSheet-content', 'edit-order-submit');
});
