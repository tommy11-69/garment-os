import { TextInput, SelectInput, TextareaInput } from './inputs.js';

const VENDOR_TYPES = [
    { label: 'Select Type', value: '' },
    { label: 'Fabric', value: 'Fabric' },
    { label: 'Yarn', value: 'Yarn' },
    { label: 'Stitching', value: 'Stitching' },
    { label: 'Dyeing', value: 'Dyeing' },
    { label: 'Printing', value: 'Printing' },
    { label: 'Embroidery', value: 'Embroidery' },
    { label: 'Packaging', value: 'Packaging' },
    { label: 'Accessories', value: 'Accessories' },
    { label: 'Other', value: 'Other' },
];

export function getCreateVendorSheetHTML() {
    return `
    <div id="createVendorForm" class="flex flex-col gap-6">

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Basic Information</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Vendor Name', id: 'new-vend-name', required: true, placeholder: 'e.g. Tiruppur Fabrics' })}
                ${TextInput({ label: 'Company / Shop Name', id: 'new-vend-company', placeholder: 'Optional' })}
                ${TextInput({ label: 'Contact Person', id: 'new-vend-contact', placeholder: 'Person to call' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Mobile Number', id: 'new-vend-phone', required: true, validationType: 'phone', type: 'tel' })}
                    ${TextInput({ label: 'WhatsApp', id: 'new-vend-whatsapp', validationType: 'phone', type: 'tel' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Email', id: 'new-vend-email', type: 'email', validationType: 'email' })}
                    ${TextInput({ label: 'GST Number', id: 'new-vend-gst', validationType: 'gst' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Vendor Details</h4>
            <div class="grid grid-cols-2 gap-4 mb-4">
                ${SelectInput({ label: 'Vendor Type', id: 'new-vend-type', options: VENDOR_TYPES })}
                ${TextInput({ label: 'Payment Terms', id: 'new-vend-terms', placeholder: 'e.g. On Delivery' })}
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${TextInput({ label: 'Credit Limit (₹)', id: 'new-vend-limit', type: 'number', placeholder: '0' })}
                ${TextInput({ label: 'UPI ID', id: 'new-vend-upi', placeholder: 'vendor@upi' })}
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Bank Details</h4>
            <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Bank Name', id: 'new-vend-bank', placeholder: 'e.g. SBI' })}
                    ${TextInput({ label: 'Account Number', id: 'new-vend-account', placeholder: '123456789' })}
                </div>
                ${TextInput({ label: 'IFSC Code', id: 'new-vend-ifsc', placeholder: 'e.g. SBIN0001234' })}
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Address</h4>
            <div class="flex flex-col gap-4">
                ${TextInput({ label: 'Address Line 1', id: 'new-vend-addr1' })}
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'City', id: 'new-vend-city' })}
                    ${TextInput({ label: 'State', id: 'new-vend-state' })}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${TextInput({ label: 'Country', id: 'new-vend-country', value: 'India' })}
                    ${TextInput({ label: 'Pincode', id: 'new-vend-pincode' })}
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-[13px] font-bold text-secondary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Additional</h4>
            ${TextareaInput({ label: 'Notes', id: 'new-vend-notes', rows: 3, placeholder: 'Any notes about this vendor...' })}
            <div class="flex items-center justify-between mt-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                <div>
                    <p class="text-[15px] font-semibold text-on-surface">Active Status</p>
                    <p class="text-[12px] text-secondary">Vendor is available for transactions</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="new-vend-active" class="sr-only peer" checked>
                    <div class="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>

        <div class="h-10"></div>
    </div>
    `;
}

export function getCreateVendorFooterHTML() {
    return `
        <button type="button" onclick="window.closeSheet('addVendorSheet')" class="flex-1 bg-surface-container-high text-on-surface font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple">
            Cancel
        </button>
        <button id="create-vendor-submit" type="button" onclick="window.saveNewVendor()" class="flex-[2] bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Save Vendor
        </button>
    `;
}

export { VENDOR_TYPES };
