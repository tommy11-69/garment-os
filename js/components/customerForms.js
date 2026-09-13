import { TextInput, SelectInput, TextareaInput } from './inputs.js?v=5.2';

export const CUSTOMER_TYPES = [
    { label: 'Brand', value: 'Brand' },
    { label: 'Manufacturer', value: 'Manufacturer' },
    { label: 'Exporter', value: 'Exporter' },
    { label: 'Retailer', value: 'Retailer' },
    { label: 'Wholesaler', value: 'Wholesaler' },
    { label: 'Distributor', value: 'Distributor' },
    { label: 'Other', value: 'Other' }
];

export const CUSTOMER_TYPE_COLORS = {
    'Brand':        { bg: 'bg-blue-500/10',    text: 'text-blue-600',    avatar: 'bg-blue-500/15 text-blue-700' },
    'Manufacturer': { bg: 'bg-purple-500/10',  text: 'text-purple-600',  avatar: 'bg-purple-500/15 text-purple-700' },
    'Exporter':     { bg: 'bg-emerald-500/10', text: 'text-emerald-600', avatar: 'bg-emerald-500/15 text-emerald-700' },
    'Retailer':     { bg: 'bg-orange-500/10',  text: 'text-orange-600',  avatar: 'bg-orange-500/15 text-orange-700' },
    'Wholesaler':   { bg: 'bg-teal-500/10',    text: 'text-teal-600',    avatar: 'bg-teal-500/15 text-teal-700' },
    'Distributor':  { bg: 'bg-indigo-500/10',  text: 'text-indigo-600',  avatar: 'bg-indigo-500/15 text-indigo-700' },
    'Other':        { bg: 'bg-primary/10',     text: 'text-primary',     avatar: 'bg-primary/15 text-primary' },
};

export function getCreateCustomerSheetHTML() {
    const customerTypeOptions = [
        { label: 'Select Type', value: '' },
        ...CUSTOMER_TYPES
    ];
    
    return `
    <div id="createCustomerForm" class="flex flex-col gap-6">
        
        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Basic Information</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Customer Name', id: 'new-cust-name', required: true })}
                ${TextInput({ label: 'Company Name', id: 'new-cust-company' })}
                ${TextInput({ label: 'Contact Person', id: 'new-cust-contact' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Mobile Number', id: 'new-cust-mobile', required: true, validationType: 'phone', type: 'tel' })}
                    ${TextInput({ label: 'WhatsApp Number', id: 'new-cust-whatsapp', validationType: 'phone', type: 'tel' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Email', id: 'new-cust-email', type: 'email', validationType: 'email' })}
                    ${TextInput({ label: 'GST Number', id: 'new-cust-gst', validationType: 'gst' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Business Details</h4>
            <div class="grid grid-cols-2 gap-4 mb-4">
                ${SelectInput({ label: 'Customer Type', id: 'new-cust-type', options: customerTypeOptions })}
                ${TextInput({ label: 'Payment Terms', id: 'new-cust-terms', placeholder: 'e.g. Net 30' })}
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Credit Limit (₹)', id: 'new-cust-limit', type: 'number', placeholder: '0.00' })}
                ${SelectInput({ label: 'Currency', id: 'new-cust-currency', options: [{label:'INR', value:'INR'}, {label:'USD', value:'USD'}, {label:'EUR', value:'EUR'}] })}
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Address</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Address Line 1', id: 'new-cust-addr1' })}
                ${TextInput({ label: 'Address Line 2', id: 'new-cust-addr2' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'City', id: 'new-cust-city' })}
                    ${TextInput({ label: 'State', id: 'new-cust-state' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Country', id: 'new-cust-country', value: 'India' })}
                    ${TextInput({ label: 'Pincode', id: 'new-cust-pincode' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Additional</h4>
            ${TextareaInput({ label: 'Notes', id: 'new-cust-notes', rows: 3 })}
            <div class="flex items-center justify-between mt-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                <div>
                    <p class="text-[15px] font-semibold text-on-surface">Active Status</p>
                    <p class="text-[12px] text-secondary">Customer can be assigned to new orders</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="new-cust-active" class="sr-only peer" checked>
                    <div class="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>
        <div class="h-10"></div>
    </div>
    `;
}

export function getCreateCustomerFooterHTML(onSaveAction = "window.saveNewCustomer()") {
    return `
        <button type="button" onclick="window.closeSheet('addCustomerSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Cancel
        </button>
        <button id="create-customer-submit" type="button" onclick="${onSaveAction}" class="flex-[2] bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Save Customer
        </button>
    `;
}
