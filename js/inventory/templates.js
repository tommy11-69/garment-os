import { SelectInput, TextInput, TextareaInput } from '../components/inputs.js';
import { TimelineEvent } from '../components/index.js';
import { CATEGORY_META } from '../repositories/InventoryRepository.js';

// ── 1. Create New Inventory Item Sheet ───────────────────────────────────────
export function getCreateItemSheetHTML(vendors = []) {
    const categoryOptions = Object.keys(CATEGORY_META).map(cat => ({
        label: cat,
        value: cat
    }));

    const unitOptions = [
        { label: 'Kilograms (Kgs)', value: 'Kgs' },
        { label: 'Meters (m)', value: 'Meters' },
        { label: 'Cones (Spools)', value: 'Cones' },
        { label: 'Pieces (Pcs)', value: 'Pcs' },
        { label: 'Bags / Sacks', value: 'Bags' },
        { label: 'Rolls', value: 'Rolls' },
        { label: 'Gross (144 Pcs)', value: 'Gross' },
        { label: 'Cartons / Boxes', value: 'Boxes' }
    ];

    const vendorOptions = [
        { label: 'Select Primary Vendor (Optional)', value: '' },
        ...vendors.map(v => ({ label: `${v.name} (${v.vendorType || 'Vendor'})`, value: v.name }))
    ];

    return `
        <div class="flex flex-col gap-4">
            <!-- Item Name -->
            ${TextInput({
                label: 'Item / Material Name',
                id: 'new-item-name',
                placeholder: 'e.g. 100% Combed Cotton Single Jersey 180 GSM',
                required: true
            })}

            <!-- Category & Subcategory -->
            <div class="grid grid-cols-2 gap-3">
                ${SelectInput({
                    label: 'Category',
                    id: 'new-item-category',
                    options: categoryOptions,
                    required: true
                })}
                ${TextInput({
                    label: 'Subtype / Subcategory',
                    id: 'new-item-subcategory',
                    placeholder: 'e.g. Single Jersey, 1x1 Rib',
                    required: false
                })}
            </div>

            <!-- SKU Code with Auto Generator -->
            <div class="flex gap-2 items-end">
                <div class="flex-1">
                    ${TextInput({
                        label: 'SKU / Item Code',
                        id: 'new-item-sku',
                        placeholder: 'e.g. FAB-CSJ-180',
                        required: true
                    })}
                </div>
                <button type="button" onclick="window.generateItemSKU()" class="px-3 py-3 rounded-2xl bg-surface-container border border-outline-variant text-[12px] font-bold text-primary active-scale transition-apple shrink-0 mb-[1px]">
                    Auto SKU
                </button>
            </div>

            <!-- Quantity & Unit -->
            <div class="grid grid-cols-2 gap-3">
                ${TextInput({
                    label: 'Opening Quantity',
                    id: 'new-item-qty',
                    type: 'number',
                    placeholder: '0',
                    required: true,
                    validationType: 'non-negative',
                    min: '0'
                })}
                ${SelectInput({
                    label: 'Unit of Measure',
                    id: 'new-item-unit',
                    options: unitOptions,
                    required: true
                })}
            </div>

            <!-- Cost Price & Reorder Point -->
            <div class="grid grid-cols-2 gap-3">
                ${TextInput({
                    label: 'Unit Cost Price (₹)',
                    id: 'new-item-cost',
                    type: 'number',
                    placeholder: '₹ 0.00',
                    required: true,
                    validationType: 'non-negative',
                    min: '0',
                    step: '0.01'
                })}
                ${TextInput({
                    label: 'Reorder Alert Min Stock',
                    id: 'new-item-min-stock',
                    type: 'number',
                    placeholder: 'e.g. 50',
                    required: true,
                    validationType: 'non-negative',
                    min: '0'
                })}
            </div>

            <!-- Location & Color -->
            <div class="grid grid-cols-2 gap-3">
                ${TextInput({
                    label: 'Warehouse Location / Rack',
                    id: 'new-item-location',
                    placeholder: 'e.g. Bay A-02, Shelf 3',
                    required: false
                })}
                ${TextInput({
                    label: 'Color / Shade / Pantone',
                    id: 'new-item-color',
                    placeholder: 'e.g. Navy Blue, White',
                    required: false
                })}
            </div>

            <!-- Primary Supplier -->
            ${SelectInput({
                label: 'Primary Supplier',
                id: 'new-item-supplier',
                options: vendorOptions,
                required: false
            })}

            <!-- Technical Specs / Notes -->
            ${TextareaInput({
                label: 'Specifications & Remarks',
                id: 'new-item-notes',
                placeholder: 'e.g. 24-gauge knit, width 30" tubular, bio-washed...',
                rows: 2
            })}

            <div class="h-4"></div>
        </div>
    `;
}

export function getCreateItemFooterHTML() {
    return `
        <button id="create-item-submit" onclick="window.saveNewItem()" class="w-full bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm cursor-pointer">
            Save Item to Inventory
        </button>
    `;
}

// ── 2. Stock In Sheet (GRN / Inward) ──────────────────────────────────────────
export function getStockInSheetHTML(items = [], vendors = [], preselectedId = null) {
    const itemOptions = [
        { label: 'Select Material to Stock In...', value: '' },
        ...items.map(i => ({
            label: `${i.name} (Cur: ${i.quantity} ${i.unit})`,
            value: i.id
        }))
    ];

    const vendorOptions = [
        { label: 'Select Supplier (Optional)', value: '' },
        ...vendors.map(v => ({ label: v.name, value: v.name }))
    ];

    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({
                label: 'Select Inventory Material',
                id: 'stock-in-item-id',
                options: itemOptions,
                value: preselectedId || '',
                required: true
            })}

            <div class="grid grid-cols-2 gap-3">
                ${TextInput({
                    label: 'Quantity Received',
                    id: 'stock-in-qty',
                    type: 'number',
                    placeholder: '0',
                    required: true,
                    validationType: 'positive',
                    min: '0.01',
                    step: 'any'
                })}
                ${TextInput({
                    label: 'Purchase Rate (₹/unit)',
                    id: 'stock-in-cost',
                    type: 'number',
                    placeholder: '₹ 0.00',
                    required: false,
                    validationType: 'non-negative',
                    min: '0',
                    step: '0.01'
                })}
            </div>

            ${SelectInput({
                label: 'Supplier / Mill',
                id: 'stock-in-supplier',
                options: vendorOptions,
                required: false
            })}

            <div class="grid grid-cols-2 gap-3">
                ${TextInput({
                    label: 'PO / DC / Invoice No.',
                    id: 'stock-in-po',
                    placeholder: 'e.g. PO-2026-099',
                    required: false
                })}
                ${TextInput({
                    label: 'Storage Bay / Location',
                    id: 'stock-in-location',
                    placeholder: 'e.g. Bay A-02',
                    required: false
                })}
            </div>

            ${TextareaInput({
                label: 'Challan Notes / Batch Lot Info',
                id: 'stock-in-notes',
                placeholder: 'e.g. Lot #429, 24 rolls inspected and received in good condition.',
                rows: 2
            })}

            <div class="h-4"></div>
        </div>
    `;
}

export function getStockInFooterHTML() {
    return `
        <button id="stock-in-submit" onclick="window.confirmStockIn()" class="w-full bg-primary text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm cursor-pointer">
            Confirm Goods Inward (Stock In)
        </button>
    `;
}

// ── 3. Stock Out Sheet (Issue to Production) ──────────────────────────────────
export function getStockOutSheetHTML(items = [], orders = [], preselectedId = null) {
    const itemOptions = [
        { label: 'Select Material to Issue...', value: '' },
        ...items.map(i => ({
            label: `${i.name} (Avail: ${i.quantity} ${i.unit})`,
            value: i.id
        }))
    ];

    const orderOptions = [
        { label: 'General / Floor Stock (No specific order)', value: '' },
        ...orders.map(o => ({
            label: `${o.id} • ${o.customerName || 'Customer'} (${o.product || 'Garment'})`,
            value: o.id
        }))
    ];

    const purposeOptions = [
        { label: 'Cutting Section (Bulk Laying)', value: 'Cutting Section' },
        { label: 'Stitching / Sewing Floor', value: 'Stitching Line' },
        { label: 'Finishing & Packaging', value: 'Finishing & Packing' },
        { label: 'Sampling / Prototyping', value: 'Sampling' },
        { label: 'Wastage / Defect Replacement', value: 'Defect Replacement' },
        { label: 'Direct External Sale / Transfer', value: 'External Transfer' }
    ];

    return `
        <div class="flex flex-col gap-4">
            ${SelectInput({
                label: 'Material to Issue',
                id: 'stock-out-item-id',
                options: itemOptions,
                value: preselectedId || '',
                required: true
            })}

            ${TextInput({
                label: 'Quantity to Issue',
                id: 'stock-out-qty',
                type: 'number',
                placeholder: '0',
                required: true,
                validationType: 'positive',
                min: '0.01',
                step: 'any'
            })}

            ${SelectInput({
                label: 'Link to Production Order',
                id: 'stock-out-order',
                options: orderOptions,
                required: false
            })}

            ${SelectInput({
                label: 'Department / Purpose',
                id: 'stock-out-purpose',
                options: purposeOptions,
                required: true
            })}

            ${TextareaInput({
                label: 'Issue Slip Notes / Supervisor Name',
                id: 'stock-out-notes',
                placeholder: 'Issued to cutting master Ramesh for batch 1...',
                rows: 2
            })}

            <div class="h-4"></div>
        </div>
    `;
}

export function getStockOutFooterHTML() {
    return `
        <button id="stock-out-submit" onclick="window.confirmStockOut()" class="w-full bg-[#FF9500] text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm cursor-pointer">
            Confirm Stock Issue (Stock Out)
        </button>
    `;
}

// ── 4. Adjust Stock Sheet (Audit & Corrections) ──────────────────────────────
export function getAdjustStockSheetHTML(items = [], preselectedId = null) {
    const itemOptions = [
        { label: 'Select Material to Adjust...', value: '' },
        ...items.map(i => ({
            label: `${i.name} (System: ${i.quantity} ${i.unit})`,
            value: i.id
        }))
    ];

    const reasonOptions = [
        { label: 'Physical Count / Stocktake Audit Mismatch', value: 'Physical Audit Mismatch' },
        { label: 'Fabric Damage / Oil Stains / Holes', value: 'Damaged / Spoiled' },
        { label: 'Cutting End-bit / Scrap Wastage', value: 'Cutting Wastage' },
        { label: 'Dyeing / Washing Shrinkage Loss', value: 'Shrinkage Loss' },
        { label: 'Data Entry Correction', value: 'Data Entry Error' }
    ];

    return `
        <div class="bg-error/10 border border-error/20 p-4 rounded-2xl mb-2">
            <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-error mt-0.5">warning</span>
                <div>
                    <h4 class="text-[14px] font-bold text-error mb-0.5">Stock Adjustment Notice</h4>
                    <p class="text-[12px] text-secondary leading-relaxed">Adjustments directly update the balance and create a permanent audit log event with variance calculation.</p>
                </div>
            </div>
        </div>

        <div class="flex flex-col gap-4">
            ${SelectInput({
                label: 'Select Material',
                id: 'adjust-item-id',
                options: itemOptions,
                value: preselectedId || '',
                required: true
            })}

            ${TextInput({
                label: 'Actual Physical Counted Quantity',
                id: 'adjust-qty',
                type: 'number',
                placeholder: 'Enter actual count in stock',
                required: true,
                validationType: 'non-negative',
                min: '0',
                step: 'any'
            })}

            ${SelectInput({
                label: 'Adjustment Reason Code',
                id: 'adjust-reason',
                options: reasonOptions,
                required: true
            })}

            ${TextareaInput({
                label: 'Audit Explanation & Approved By',
                id: 'adjust-notes',
                placeholder: 'Stock auditor notes, physical count verified by floor supervisor...',
                rows: 2,
                required: true
            })}

            <div class="h-4"></div>
        </div>
    `;
}

export function getAdjustStockFooterHTML() {
    return `
        <button id="adjust-submit" onclick="window.confirmStockAdjust()" class="w-full bg-error text-white font-bold text-[16px] py-4 rounded-2xl active-scale transition-apple shadow-sm cursor-pointer">
            Confirm Balance Adjustment
        </button>
    `;
}

// ── 5. Item Details Header & Content ──────────────────────────────────────────
export function getItemDetailsHeader(item) {
    if (!item) return '';
    return `
        <div class="px-5 py-4 flex justify-between items-start border-b border-outline-variant/30">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-2xl ${item.iconColor || 'bg-primary/10 text-primary'} flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[26px]">${item.icon || 'inventory_2'}</span>
                </div>
                <div class="min-w-0">
                    <span class="text-[12px] font-bold text-secondary uppercase tracking-wider block">
                        ${item.category}${item.subCategory ? ` • ${item.subCategory}` : ''}
                    </span>
                    <h2 class="text-[18px] sm:text-[20px] font-bold text-on-surface leading-tight truncate">${item.name}</h2>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        <span class="font-mono text-[12px] text-primary font-semibold">${item.sku}</span>
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${item.statusColor}">
                            ${item.status}
                        </span>
                    </div>
                </div>
            </div>
            <button onclick="window.closeSheet('itemDetailsSheet')" class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-secondary active-scale transition-apple shrink-0">
                <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    `;
}

export function getItemDetailsContent(item, vendor = null) {
    if (!item) return '';

    const qty = Number(item.quantity || 0);
    const cost = Number(item.costPrice || item.unitPrice || 0);
    const totalVal = Number(item.totalValue) || (qty * cost);
    const minStock = Number(item.minStock || 0);

    const history = Array.isArray(item.movementHistory) ? item.movementHistory : [];

    return `
        <div class="flex flex-col gap-5 p-5">
            <!-- 4-KPI Metric Grid -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 shadow-xs">
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">In Hand Stock</span>
                    <span class="text-[22px] font-extrabold text-on-surface leading-none block">
                        ${qty.toLocaleString()} <span class="text-[13px] text-secondary font-medium">${item.unit}</span>
                    </span>
                    <span class="text-[11px] text-secondary mt-1 block">Reorder min: ${minStock} ${item.unit}</span>
                </div>

                <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 shadow-xs">
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Total Valuation</span>
                    <span class="text-[22px] font-extrabold text-primary leading-none block">
                        ₹${totalVal.toLocaleString('en-IN')}
                    </span>
                    <span class="text-[11px] text-secondary mt-1 block">Rate: ₹${cost.toLocaleString('en-IN')} / ${item.unit}</span>
                </div>

                <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 shadow-xs">
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Location</span>
                    <span class="text-[16px] font-bold text-on-surface leading-snug block flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                        ${item.location || 'Unassigned'}
                    </span>
                </div>

                <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 shadow-xs">
                    <span class="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">Color / Shade</span>
                    <span class="text-[15px] font-bold text-on-surface leading-snug block truncate">
                        ${item.color || 'Standard / Natural'}
                    </span>
                </div>
            </div>

            <!-- Technical Specifications -->
            ${item.specifications && Object.keys(item.specifications).length > 0 ? `
                <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/50 p-4 shadow-xs">
                    <h3 class="text-[14px] font-bold text-on-surface mb-3 flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px] text-secondary">tune</span>
                        Technical Specifications
                    </h3>
                    <div class="grid grid-cols-2 gap-2 text-[13px]">
                        ${Object.entries(item.specifications).map(([key, val]) => `
                            <div class="p-2 rounded-xl bg-surface-container/60 flex flex-col">
                                <span class="text-[10px] font-bold text-secondary uppercase">${key}</span>
                                <span class="font-semibold text-on-surface mt-0.5">${val}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Supplier Information Card -->
            <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/50 p-4 shadow-xs">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-[14px] font-bold text-on-surface flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px] text-secondary">storefront</span>
                        Primary Supplier
                    </h3>
                    ${item.supplier ? `
                        <span class="text-[11px] font-semibold text-primary">Verified Vendor</span>
                    ` : ''}
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[15px] font-bold text-on-surface block">${item.supplier || 'No supplier linked'}</span>
                        <span class="text-[12px] text-secondary">Supplies: ${item.category} materials</span>
                    </div>
                    ${vendor && vendor.phone ? `
                        <div class="flex gap-2">
                            <a href="tel:${vendor.phone}" class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary active-scale">
                                <span class="material-symbols-outlined text-[18px]">call</span>
                            </a>
                            <a href="https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}" target="_blank" class="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] active-scale">
                                <span class="material-symbols-outlined text-[18px]">chat</span>
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Stock Movement History (Audit Trail) -->
            <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/50 p-4 shadow-xs">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-[14px] font-bold text-on-surface flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[18px] text-secondary">history</span>
                        Movement & Audit History
                    </h3>
                    <span class="text-[11px] font-bold text-secondary">${history.length} Events</span>
                </div>

                ${history.length === 0 ? `
                    <p class="text-[13px] text-secondary py-3 text-center">No movement transactions recorded yet.</p>
                ` : `
                    <div class="flex flex-col gap-2.5">
                        ${history.slice().reverse().map(mov => {
                            const isStockIn = mov.type === 'STOCK_IN';
                            const isStockOut = mov.type === 'STOCK_OUT';
                            const isAdjust = mov.type === 'ADJUSTMENT';

                            const badgeColor = isStockIn
                                ? 'bg-[#34C759]/10 text-[#34C759]'
                                : isStockOut
                                ? 'bg-[#FF9500]/10 text-[#FF9500]'
                                : 'bg-[#5856D6]/10 text-[#5856D6]';

                            const icon = isStockIn ? 'add_circle' : isStockOut ? 'remove_circle' : 'change_circle';
                            const title = isStockIn
                                ? `+${mov.qty} ${item.unit} (Stock In)`
                                : isStockOut
                                ? `-${mov.qty} ${item.unit} (Issued)`
                                : `Adjusted to ${mov.newQty} ${item.unit}`;

                            const formattedDate = mov.date ? new Date(mov.date).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            }) : '';

                            return `
                                <div class="p-3 rounded-xl bg-surface-container/40 border border-outline-variant/30 flex justify-between items-start gap-2">
                                    <div class="flex gap-2.5 items-start min-w-0">
                                        <div class="w-8 h-8 rounded-lg ${badgeColor} flex items-center justify-center shrink-0 mt-0.5">
                                            <span class="material-symbols-outlined text-[18px]">${icon}</span>
                                        </div>
                                        <div class="min-w-0">
                                            <span class="text-[13px] font-bold text-on-surface block leading-tight">${title}</span>
                                            <span class="text-[11px] text-secondary block mt-0.5">
                                                ${mov.ref || mov.reason || 'Manual log'}${mov.purpose ? ` • ${mov.purpose}` : ''}${mov.notes ? ` • "${mov.notes}"` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <span class="text-[11px] text-secondary shrink-0 font-medium">${formattedDate}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            <div class="h-6"></div>
        </div>
    `;
}

export function getItemDetailsFooter(item) {
    if (!item) return '';
    return `
        <div class="grid grid-cols-3 gap-2 w-full">
            <button onclick="window.openStockOutModal('${item.id}')" class="bg-surface-container-high text-on-surface font-bold text-[14px] py-3.5 rounded-2xl active-scale transition-apple cursor-pointer flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-[18px] text-[#FF9500]">outbox</span>
                Stock Out
            </button>
            <button onclick="window.openAdjustModal('${item.id}')" class="bg-surface-container-high text-on-surface font-bold text-[14px] py-3.5 rounded-2xl active-scale transition-apple cursor-pointer flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-[18px] text-secondary">tune</span>
                Adjust
            </button>
            <button onclick="window.openStockInModal('${item.id}')" class="bg-primary text-white font-bold text-[14px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm cursor-pointer flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-[18px]">add</span>
                Stock In
            </button>
        </div>
    `;
}

