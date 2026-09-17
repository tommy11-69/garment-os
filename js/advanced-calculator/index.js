import { api } from '../services/api.js?v=5.2';
import { advancedCalculatorStore as store } from '../stores/AdvancedCalculatorStore.js?v=5.2';
import { BottomSheet } from '../components/index.js?v=5.2';

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id)?.value) || 0;
let isSavingCosting = false;

function applyEditMode(editId) {
    const isEditMode = Boolean(editId);
    const badge = $('edit-mode-badge');
    const saveButton = $('btn-save-draft');
    const quoteSaveButton = $('quote-save-costing');

    if (badge) {
        badge.classList.toggle('hidden', !isEditMode);
        badge.classList.toggle('flex', isEditMode);
    }

    if (isEditMode) {
        if (saveButton) saveButton.innerHTML = '<span class="material-symbols-outlined text-[18px]">update</span> Update Costing';
        if (quoteSaveButton) quoteSaveButton.innerHTML = '<span class="material-symbols-outlined text-[18px]">update</span> Update';
    }
}

// Colors for Breakdown Bar
const C = {
    fabric: '#0071E3',       // Apple Blue
    cmt: '#FF9F0A',          // Amber / Orange
    printing: '#AF52DE',     // Purple
    accessories: '#34C759',  // Green
    overheads: '#5856D6'     // Indigo
};

// ══════════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof window.initTheme === 'function') window.initTheme();

        // Initialize sheets
        initSheets();

        // Check URL for ID (Edit Mode or Print)
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        applyEditMode(id);
        
        if (id) {
            await loadCostingById(id);
            if (params.get('action') === 'print') {
                setTimeout(() => window.downloadQuotePDF?.(), 600);
            }
        } else {
            // Check session storage draft
            restoreDraftSession();
            renderSizeGrid();
            syncFormFromStore();
            recalcAdvanced();
        }

        // Global events
        bindGlobalEvents();

    } catch (err) {
        console.error('Advanced Calculator Init Error:', err);
    }
});

function bindGlobalEvents() {
    $('adv-client')?.addEventListener('input', (e) => {
        store.update({ clientName: e.target.value });
    });
    $('adv-garment-name')?.addEventListener('input', (e) => {
        store.update({ garmentName: e.target.value });
    });
}

// ══════════════════════════════════════════════════════
//  MEASUREMENT UNIT TOGGLE (cm vs inches)
// ══════════════════════════════════════════════════════
window.setMeasurementUnit = function(newUnit) {
    const s = store.state;
    const oldUnit = s.unit || 'in';
    if (oldUnit === newUnit) return;

    const isToInches = newUnit === 'in';
    const factor = isToInches ? (1 / 2.54) : 2.54;

    const newSizes = s.sizes.map(sz => ({
        ...sz,
        bodyL: sz.bodyL > 0 ? parseFloat((sz.bodyL * factor).toFixed(2)) : 0,
        chest: sz.chest > 0 ? parseFloat((sz.chest * factor).toFixed(2)) : 0,
        slvL: sz.slvL > 0 ? parseFloat((sz.slvL * factor).toFixed(2)) : 0,
        slvDia: sz.slvDia > 0 ? parseFloat((sz.slvDia * factor).toFixed(2)) : 0,
    }));

    const newBodyLM = (s.bodyLM || 2.5) * factor;
    const newChestM = (s.chestM || 1.5) * factor;
    const newSlvLM = (s.slvLM || 1.5) * factor;
    const newSlvDiaM = (s.slvDiaM || 1.5) * factor;

    store.update({
        unit: newUnit,
        sizes: newSizes,
        bodyLM: newBodyLM,
        chestM: newChestM,
        slvLM: newSlvLM,
        slvDiaM: newSlvDiaM
    });

    // Update UI buttons
    document.querySelectorAll('.unit-toggle-btn').forEach(b => {
        const isCmBtn = b.textContent.trim() === 'cm';
        b.classList.toggle('active', (isCmBtn && newUnit === 'cm') || (!isCmBtn && newUnit === 'in'));
    });

    const sub = $('unit-subtitle');
    if (sub) sub.textContent = `Dimensions in ${newUnit === 'in' ? 'inches (in)' : 'centimeters (cm)'}. Fabric weight is calculated per size individually.`;

    const marginBodyEl = $('pat-margin-body');
    const marginChestEl = $('pat-margin-chest');
    const marginSlvEl = $('pat-margin-slv');
    const marginDiaEl = $('pat-margin-dia');
    if (marginBodyEl) marginBodyEl.value = newBodyLM > 0 ? newBodyLM : '';
    if (marginChestEl) marginChestEl.value = newChestM > 0 ? newChestM : '';
    if (marginSlvEl) marginSlvEl.value = newSlvLM > 0 ? newSlvLM : '';
    if (marginDiaEl) marginDiaEl.value = newSlvDiaM > 0 ? newSlvDiaM : '';

    renderSizeGrid();
    recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  SIZE-SPECIFIC PATTERN GRID RENDERER (NO DUPLICATES)
// ══════════════════════════════════════════════════════
function renderSizeGrid() {
    const container = $('sizes-grid-container');
    if (!container) return;

    const s = store.state;
    const uLabel = (s.unit || 'cm') === 'in' ? 'in' : 'cm';

    // Desktop/Tablet Header + Rows
    let html = `
        <div class="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider border-b border-outline-variant/30 dark:border-slate-800">
            <div class="col-span-2">Size</div>
            <div class="col-span-2">Qty (pcs)</div>
            <div class="col-span-2">Body L (${uLabel})</div>
            <div class="col-span-2">Chest (${uLabel})</div>
            <div class="col-span-1">Slv L</div>
            <div class="col-span-1">Dia</div>
            <div class="col-span-1 text-right">Wt/pc</div>
            <div class="col-span-1 text-right">Act</div>
        </div>
    `;

    s.sizes.forEach((sz, idx) => {
        html += `
            <!-- Desktop / Tablet Row (sm:grid) -->
            <div class="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 items-center bg-surface-container-lowest/70 dark:bg-slate-800/40 hover:bg-surface-container-lowest dark:hover:bg-slate-800/70 rounded-2xl border border-outline-variant/20 dark:border-slate-800/80 transition-colors" data-size-id="${sz.id}">
                <div class="col-span-2">
                    <input type="text" class="calc-input !h-9 text-[13px] font-bold" value="${sz.name || ''}" 
                           oninput="onSizePropChange(${idx}, 'name', this.value)" placeholder="Size">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" class="calc-input !h-9 text-[13px] font-bold text-center" value="${sz.qty > 0 ? sz.qty : ''}" 
                           oninput="onSizePropChange(${idx}, 'qty', this.value)" placeholder="0">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center" value="${sz.bodyL > 0 ? sz.bodyL : ''}" 
                           oninput="onSizePropChange(${idx}, 'bodyL', this.value)" placeholder="70">
                </div>
                <div class="col-span-2">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center" value="${sz.chest > 0 ? sz.chest : ''}" 
                           oninput="onSizePropChange(${idx}, 'chest', this.value)" placeholder="54">
                </div>
                <div class="col-span-1">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center !px-1" value="${sz.slvL > 0 ? sz.slvL : ''}" 
                           oninput="onSizePropChange(${idx}, 'slvL', this.value)" placeholder="22">
                </div>
                <div class="col-span-1">
                    <input type="number" min="0" step="0.1" class="calc-input !h-9 text-[13px] text-center !px-1" value="${sz.slvDia > 0 ? sz.slvDia : ''}" 
                           oninput="onSizePropChange(${idx}, 'slvDia', this.value)" placeholder="18">
                </div>
                <div class="col-span-1 text-right flex flex-col items-end justify-center">
                    <span id="sz-wt-desktop-${idx}" class="text-[13px] font-bold text-primary dark:text-blue-400 tabular-nums">
                        ${sz.weightGms > 0 ? sz.weightGms.toFixed(1) : '0.0'}g
                    </span>
                    <span id="sz-yield-desktop-${idx}" class="text-[10px] text-secondary dark:text-slate-400 font-semibold tabular-nums">
                        ${sz.weightGms > 0 ? (1000 / sz.weightGms).toFixed(1) + ' p/kg' : '—'}
                    </span>
                </div>
                <div class="col-span-1 text-right">
                    <button type="button" onclick="removeSizeRow(${idx})" class="w-8 h-8 rounded-lg hover:bg-error/10 text-secondary hover:text-error flex items-center justify-center transition-colors ml-auto" title="Remove Size">
                        <span class="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            </div>

            <!-- Mobile Card View (< sm:) -->
            <div class="flex sm:hidden flex-col gap-3 bg-surface-container-lowest/90 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-outline-variant/25 dark:border-slate-800 shadow-sm" data-size-id-mobile="${sz.id}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <input type="text" class="calc-input !h-8 !w-20 text-[13px] font-bold" value="${sz.name || ''}" 
                               oninput="onSizePropChange(${idx}, 'name', this.value)" placeholder="Size">
                        <span class="text-[11px] text-secondary font-medium">Qty:</span>
                        <input type="number" min="0" class="calc-input !h-8 !w-24 text-[13px] font-bold text-center" value="${sz.qty > 0 ? sz.qty : ''}" 
                               oninput="onSizePropChange(${idx}, 'qty', this.value)" placeholder="0">
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="flex flex-col items-end">
                            <span id="sz-wt-mobile-${idx}" class="text-[12px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                ${sz.weightGms > 0 ? sz.weightGms.toFixed(1) : '0.0'} gms
                            </span>
                            <span id="sz-yield-mobile-${idx}" class="text-[10px] text-secondary dark:text-slate-400 font-medium mt-0.5">
                                ${sz.weightGms > 0 ? (1000 / sz.weightGms).toFixed(1) + ' pcs/kg' : ''}
                            </span>
                        </div>
                        <button type="button" onclick="removeSizeRow(${idx})" class="w-7 h-7 rounded-lg text-secondary hover:text-error flex items-center justify-center" title="Delete">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-4 gap-2 pt-1 border-t border-outline-variant/15 text-center">
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Body L (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.bodyL > 0 ? sz.bodyL : ''}" 
                               oninput="onSizePropChange(${idx}, 'bodyL', this.value)" placeholder="70">
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Chest (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.chest > 0 ? sz.chest : ''}" 
                               oninput="onSizePropChange(${idx}, 'chest', this.value)" placeholder="54">
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Slv L (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.slvL > 0 ? sz.slvL : ''}" 
                               oninput="onSizePropChange(${idx}, 'slvL', this.value)" placeholder="22">
                    </div>
                    <div>
                        <span class="text-[10px] text-secondary block mb-1">Slv Dia (${uLabel})</span>
                        <input type="number" min="0" step="0.1" class="calc-input !h-8 text-[12px] text-center !px-1" value="${sz.slvDia > 0 ? sz.slvDia : ''}" 
                               oninput="onSizePropChange(${idx}, 'slvDia', this.value)" placeholder="18">
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateKidsChipsState();
}

const DEFAULT_SIZE_MEASUREMENTS = {
    // Kids / Small Sizes
    '22"':      { bodyL: 16.25, chest: 13.50, slvL: 6.25, slvDia: 4.75 },
    '22':       { bodyL: 16.25, chest: 13.50, slvL: 6.25, slvDia: 4.75 },
    '24"':      { bodyL: 17.50, chest: 14.25, slvL: 6.50, slvDia: 5.00 },
    '24':       { bodyL: 17.50, chest: 14.25, slvL: 6.50, slvDia: 5.00 },
    '26"':      { bodyL: 18.75, chest: 15.00, slvL: 6.75, slvDia: 5.25 },
    '26':       { bodyL: 18.75, chest: 15.00, slvL: 6.75, slvDia: 5.25 },
    '28"':      { bodyL: 20.00, chest: 15.75, slvL: 7.00, slvDia: 5.50 },
    '28':       { bodyL: 20.00, chest: 15.75, slvL: 7.00, slvDia: 5.50 },
    '30"':      { bodyL: 21.25, chest: 16.50, slvL: 7.25, slvDia: 5.75 },
    '30':       { bodyL: 21.25, chest: 16.50, slvL: 7.25, slvDia: 5.75 },
    '32"':      { bodyL: 22.50, chest: 17.25, slvL: 7.50, slvDia: 6.00 },
    '32':       { bodyL: 22.50, chest: 17.25, slvL: 7.50, slvDia: 6.00 },

    // Adult Standard Sizes
    '34"':      { bodyL: 23.75, chest: 18.00, slvL: 7.75, slvDia: 6.25 },
    '34':       { bodyL: 23.75, chest: 18.00, slvL: 7.75, slvDia: 6.25 },
    '34 (XS)':  { bodyL: 23.75, chest: 18.00, slvL: 7.75, slvDia: 6.25 },
    '36"':      { bodyL: 25.00, chest: 18.75, slvL: 8.00, slvDia: 6.50 },
    '36':       { bodyL: 25.00, chest: 18.75, slvL: 8.00, slvDia: 6.50 },
    '36 (S)':   { bodyL: 25.00, chest: 18.75, slvL: 8.00, slvDia: 6.50 },
    '38"':      { bodyL: 26.25, chest: 19.50, slvL: 8.25, slvDia: 6.75 },
    '38':       { bodyL: 26.25, chest: 19.50, slvL: 8.25, slvDia: 6.75 },
    '38 (M)':   { bodyL: 26.25, chest: 19.50, slvL: 8.25, slvDia: 6.75 },
    '40"':      { bodyL: 27.50, chest: 20.25, slvL: 8.50, slvDia: 7.00 },
    '40':       { bodyL: 27.50, chest: 20.25, slvL: 8.50, slvDia: 7.00 },
    '40 (L)':   { bodyL: 27.50, chest: 20.25, slvL: 8.50, slvDia: 7.00 },
    '42"':      { bodyL: 28.75, chest: 21.00, slvL: 8.75, slvDia: 7.25 },
    '42':       { bodyL: 28.75, chest: 21.00, slvL: 8.75, slvDia: 7.25 },
    '42 (XL)':  { bodyL: 28.75, chest: 21.00, slvL: 8.75, slvDia: 7.25 },
    '44"':      { bodyL: 30.00, chest: 21.75, slvL: 9.00, slvDia: 7.50 },
    '44':       { bodyL: 30.00, chest: 21.75, slvL: 9.00, slvDia: 7.50 },
    '44 (2XL)': { bodyL: 30.00, chest: 21.75, slvL: 9.00, slvDia: 7.50 },

    // Short Code Fallbacks
    'XS':       { bodyL: 23.75, chest: 18.00, slvL: 7.75, slvDia: 6.25 },
    'S':        { bodyL: 25.00, chest: 18.75, slvL: 8.00, slvDia: 6.50 },
    'M':        { bodyL: 26.25, chest: 19.50, slvL: 8.25, slvDia: 6.75 },
    'L':        { bodyL: 27.50, chest: 20.25, slvL: 8.50, slvDia: 7.00 },
    'XL':       { bodyL: 28.75, chest: 21.00, slvL: 8.75, slvDia: 7.25 },
    '2XL':      { bodyL: 30.00, chest: 21.75, slvL: 9.00, slvDia: 7.50 }
};

function findSortedInsertIndex(newSizeName) {
    const numMatch = newSizeName.match(/\d+/);
    if (!numMatch) return null;
    const newNum = parseInt(numMatch[0], 10);
    const s = store.state;
    for (let i = 0; i < s.sizes.length; i++) {
        const curMatch = s.sizes[i].name.match(/\d+/);
        if (curMatch && parseInt(curMatch[0], 10) > newNum) {
            return i;
        }
    }
    return null;
}

window.toggleKidsSizePicker = function() {
    const tray = $('kids-size-tray');
    if (!tray) return;
    const isHidden = tray.classList.contains('hidden');
    if (isHidden) {
        tray.classList.remove('hidden');
        tray.classList.add('flex');
        updateKidsChipsState();
    } else {
        tray.classList.remove('flex');
        tray.classList.add('hidden');
    }
};

window.addSizeByPreset = function(sizeKey) {
    const s = store.state;
    const cleanKey = sizeKey.replace(/"/g, '').trim();
    const existing = s.sizes.find(x => x.name.replace(/"/g, '').trim() === cleanKey);
    if (existing) {
        window.showToast?.(`Size ${sizeKey} is already in the order`, 'info');
        return;
    }

    const preset = DEFAULT_SIZE_MEASUREMENTS[sizeKey] || DEFAULT_SIZE_MEASUREMENTS[cleanKey];
    if (!preset) return;

    const unit = s.unit || 'in';
    const isCm = unit === 'cm';
    const mult = isCm ? 2.54 : 1.0;
    const defaults = {
        qty: 0,
        bodyL: parseFloat((preset.bodyL * mult).toFixed(2)),
        chest: parseFloat((preset.chest * mult).toFixed(2)),
        slvL: parseFloat((preset.slvL * mult).toFixed(2)),
        slvDia: parseFloat((preset.slvDia * mult).toFixed(2))
    };

    const insertIdx = findSortedInsertIndex(sizeKey);
    store.addSize(sizeKey, defaults, insertIdx);

    renderSizeGrid();
    recalcAdvanced();
    updateKidsChipsState();
    window.showToast?.(`Added size ${sizeKey}`, 'success');
};

window.addKidsRun = function() {
    const kidsSizes = ['22"', '24"', '26"', '28"', '30"', '32"'];
    let addedCount = 0;
    kidsSizes.forEach(sz => {
        const cleanKey = sz.replace(/"/g, '').trim();
        const existing = store.state.sizes.find(x => x.name.replace(/"/g, '').trim() === cleanKey);
        if (!existing) {
            const preset = DEFAULT_SIZE_MEASUREMENTS[sz];
            const unit = store.state.unit || 'in';
            const isCm = unit === 'cm';
            const mult = isCm ? 2.54 : 1.0;
            const defaults = {
                qty: 0,
                bodyL: parseFloat((preset.bodyL * mult).toFixed(2)),
                chest: parseFloat((preset.chest * mult).toFixed(2)),
                slvL: parseFloat((preset.slvL * mult).toFixed(2)),
                slvDia: parseFloat((preset.slvDia * mult).toFixed(2))
            };
            const insertIdx = findSortedInsertIndex(sz);
            store.addSize(sz, defaults, insertIdx);
            addedCount++;
        }
    });

    renderSizeGrid();
    recalcAdvanced();
    updateKidsChipsState();
    if (addedCount > 0) {
        window.showToast?.(`Added ${addedCount} kids sizes (22"–32")`, 'success');
    } else {
        window.showToast?.('All kids sizes are already added', 'info');
    }
};

function updateKidsChipsState() {
    const s = store.state;
    const existingClean = s.sizes.map(x => x.name.replace(/"/g, '').trim());
    document.querySelectorAll('.kids-chip-btn').forEach(btn => {
        const sz = (btn.getAttribute('data-size') || btn.textContent.replace('+', '').replace(/"/g, '')).trim();
        if (existingClean.includes(sz)) {
            btn.classList.add('opacity-40', 'pointer-events-none');
            btn.classList.remove('hover:bg-primary', 'hover:text-white');
        } else {
            btn.classList.remove('opacity-40', 'pointer-events-none');
            btn.classList.add('hover:bg-primary', 'hover:text-white');
        }
    });
}

// Targeted handler without destroying input focus!
window.onSizePropChange = function(index, prop, val) {
    const s = store.state;
    if (!s.sizes[index]) return;

    if (prop === 'name') {
        s.sizes[index].name = val;
        const key = val?.trim();
        const cleanKey = key?.replace(/"/g, '');
        const preset = DEFAULT_SIZE_MEASUREMENTS[key] || DEFAULT_SIZE_MEASUREMENTS[cleanKey] || DEFAULT_SIZE_MEASUREMENTS[key?.toUpperCase()];
        if (preset) {
            const isCm = (s.unit || 'in') === 'cm';
            const mult = isCm ? 2.54 : 1.0;
            if (!s.sizes[index].bodyL) s.sizes[index].bodyL = parseFloat((preset.bodyL * mult).toFixed(2));
            if (!s.sizes[index].chest) s.sizes[index].chest = parseFloat((preset.chest * mult).toFixed(2));
            if (!s.sizes[index].slvL) s.sizes[index].slvL = parseFloat((preset.slvL * mult).toFixed(2));
            if (!s.sizes[index].slvDia) s.sizes[index].slvDia = parseFloat((preset.slvDia * mult).toFixed(2));
        }
    } else {
        s.sizes[index][prop] = parseFloat(val) || 0;
    }

    recalcAdvanced(false); // don't re-render entire grid to keep cursor focus
};

window.addNewSizeRow = function() {
    const s = store.state;
    const standardSizes = ['34 (XS)', '36 (S)', '38 (M)', '40 (L)', '42 (XL)', '44 (2XL)'];
    const existingNames = s.sizes.map(x => x.name.toUpperCase());
    const nextName = standardSizes.find(n => !existingNames.includes(n.toUpperCase())) || `Size ${s.sizes.length + 1}`;

    const unit = s.unit || 'in';
    const isCm = unit === 'cm';
    const preset = DEFAULT_SIZE_MEASUREMENTS[nextName];
    const lastSize = s.sizes[s.sizes.length - 1] || { bodyL: 0, chest: 0, slvL: 0, slvDia: 0 };

    let defaults = {};
    if (preset) {
        defaults = isCm ? {
            bodyL: parseFloat((preset.bodyL * 2.54).toFixed(2)),
            chest: parseFloat((preset.chest * 2.54).toFixed(2)),
            slvL: parseFloat((preset.slvL * 2.54).toFixed(2)),
            slvDia: parseFloat((preset.slvDia * 2.54).toFixed(2))
        } : { ...preset };
    } else {
        defaults = {
            bodyL: lastSize.bodyL > 0 ? lastSize.bodyL + (isCm ? 2 : 1.25) : 0,
            chest: lastSize.chest > 0 ? lastSize.chest + (isCm ? 2 : 0.75) : 0,
            slvL: lastSize.slvL > 0 ? lastSize.slvL + (isCm ? 1 : 0.25) : 0,
            slvDia: lastSize.slvDia > 0 ? lastSize.slvDia + (isCm ? 0.5 : 0.25) : 0
        };
    }

    const insertIdx = findSortedInsertIndex(nextName);
    store.addSize(nextName, defaults, insertIdx);

    renderSizeGrid();
    recalcAdvanced();
    updateKidsChipsState();
};

window.removeSizeRow = function(idx) {
    store.removeSize(idx);
    renderSizeGrid();
    recalcAdvanced();
};

window.toggleAllowancesDrawer = function() {
    const drawer = $('allowances-drawer');
    const icon = $('allowances-drawer-icon');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
        drawer.classList.remove('hidden');
        drawer.classList.add('grid');
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        drawer.classList.remove('grid');
        drawer.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

window.onGlobalParamChange = function() {
    recalcAdvanced(false);
};

// ══════════════════════════════════════════════════════
//  CORE CALCULATION ENGINE
// ══════════════════════════════════════════════════════
window.recalcAdvanced = function(updateGridDOM = true) {
    const s = store.state;
    const unit = s.unit || 'cm';
    const unitMult = unit === 'in' ? 2.54 : 1.0;

    // 1. Read Global Specs
    const gsm = num('adv-gsm') || s.gsm;
    const fabricPriceKg = num('adv-fabric-price-kg') || s.fabricPriceKg;
    const wastage = num('adv-wastage') || s.wastage;

    const bodyLM = num('pat-margin-body') || s.bodyLM;
    const chestM = num('pat-margin-chest') || s.chestM;
    const slvLM = num('pat-margin-slv') || s.slvLM;
    const slvDiaM = num('pat-margin-dia') || s.slvDiaM;

    // 2. Individual Size Calculations (converting inches to cm if unit === 'in')
    let totalQty = 0;
    let baseTotalFabricKg = 0;

    s.sizes.forEach((sz, idx) => {
        let weightGms = 0;
        if (gsm > 0 && (sz.bodyL > 0 || sz.chest > 0)) {
            const bodyL_cm = (sz.bodyL + bodyLM) * unitMult;
            const chest_cm = (sz.chest + chestM) * unitMult;
            const bodyGms = bodyL_cm * chest_cm * 2 * gsm / 10000;

            const slvL_cm = (sz.slvL + slvLM) * unitMult;
            const slvDia_cm = (sz.slvDia + slvDiaM) * unitMult;
            const slvGms = slvL_cm * slvDia_cm * 2 * gsm / 10000;

            weightGms = bodyGms + slvGms;
        }

        const sizeFabricKg = (weightGms * sz.qty) / 1000;
        sz.weightGms = weightGms;
        sz.totalKg = sizeFabricKg;

        totalQty += sz.qty;
        baseTotalFabricKg += sizeFabricKg;

        // In-place live element update without cursor disruption
        const dtEl = $(`sz-wt-desktop-${idx}`);
        if (dtEl) dtEl.textContent = (weightGms > 0 ? weightGms.toFixed(1) : '0.0') + 'g';
        const dtYieldEl = $(`sz-yield-desktop-${idx}`);
        if (dtYieldEl) dtYieldEl.textContent = weightGms > 0 ? (1000 / weightGms).toFixed(1) + ' p/kg' : '—';

        const mbEl = $(`sz-wt-mobile-${idx}`);
        if (mbEl) mbEl.textContent = (weightGms > 0 ? weightGms.toFixed(1) : '0.0') + ' gms';
        const mbYieldEl = $(`sz-yield-mobile-${idx}`);
        if (mbYieldEl) mbYieldEl.textContent = weightGms > 0 ? (1000 / weightGms).toFixed(1) + ' pcs/kg' : '';
    });

    // Total Fabric Required (with Wastage)
    const totalFabricKg = baseTotalFabricKg * (1 + wastage / 100);
    const avgWeightGms = totalQty > 0 ? (baseTotalFabricKg * 1000) / totalQty : 0;
    const pcsPerKg = avgWeightGms > 0 ? 1000 / avgWeightGms : 0;
    const totalFabricCost = totalFabricKg * fabricPriceKg;
    const fabricCostPc = totalQty > 0 ? totalFabricCost / totalQty : 0;

    // 3. Read Cost Modules
    const mode = s.cmtMode;
    const cmt = num('u-cmt');
    const cutting = num('u-cutting');
    const fusing = num('u-fusing');
    const wages = num('u-wages');
    const packing = num('u-packing');

    const printing = num('u-printing');
    const sublimation = num('u-sublimation');
    const allowances = num('u-allowances');
    const overheads = num('u-overheads');

    const acc1 = num('u-acc1');
    const acc2 = num('u-acc2');
    const acc3 = num('u-acc3');
    const pattern = num('u-pattern');

    const cmtTotalPc = mode === 'combined' ? cmt : (cutting + fusing + wages + packing);
    const printingTotalPc = printing + sublimation;
    const allowancesTotalPc = allowances + overheads;
    const lumpSumTotal = acc1 + acc2 + acc3 + pattern;
    const lumpSumPc = totalQty > 0 ? lumpSumTotal / totalQty : 0;

    // Total Cost Price (CP)
    const cpPc = fabricCostPc + cmtTotalPc + printingTotalPc + allowancesTotalPc + lumpSumPc;
    const totalCost = cpPc * totalQty;

    // 4. Selling Price (SP) & Profit Calculations
    let spPc = (s.spPc !== undefined && s.spPc !== null) ? s.spPc : null;
    let profitPct = (s.profitPct !== undefined && s.profitPct !== null) ? s.profitPct : null;
    const lastEdited = s.lastEdited || (spPc !== null && spPc > 0 ? 'sp-pc' : (profitPct !== null ? 'pct' : 'pct'));

    if (lastEdited === 'pct' && profitPct !== null && profitPct !== undefined) {
        spPc = cpPc * (1 + profitPct / 100);
    } else if (lastEdited === 'sp-pc' && spPc !== null && spPc > 0) {
        profitPct = cpPc > 0 ? ((spPc - cpPc) / cpPc) * 100 : 0;
    } else if (lastEdited === 'sp-total') {
        const totalSP = num('u-sp-total');
        if (totalSP > 0) spPc = totalQty > 0 ? totalSP / totalQty : 0;
        profitPct = cpPc > 0 ? ((spPc - cpPc) / cpPc) * 100 : 0;
    } else if (spPc !== null && spPc > 0) {
        profitPct = cpPc > 0 ? ((spPc - cpPc) / cpPc) * 100 : 0;
    } else if (cpPc > 0) {
        profitPct = 30;
        spPc = cpPc * 1.30;
    }

    const totalSales = (spPc || 0) * totalQty;
    const profitDone = totalSales - totalCost;

    // Update Store
    store.update({
        totalQty,
        bodyLM, chestM, slvLM, slvDiaM,
        gsm, fabricPriceKg, wastage,
        totalFabricKg, avgWeightGms, pcsPerKg, fabricCostPc, totalFabricCost,
        cmt, cutting, fusing, wages, packing,
        printing, sublimation, allowances, overheads,
        acc1, acc2, acc3, pattern,
        cpPc, totalCost, spPc, totalSales, profitPct, profitDone
    });

    // Update UI elements
    updateAggregatedUI();
};

function updateAggregatedUI() {
    const s = store.state;
    const sym = s.currency || '₹';

    // Grid badge
    if ($('grid-total-qty')) $('grid-total-qty').textContent = s.totalQty;

    // Fabric Rollup
    if ($('res-total-fabric-kg')) $('res-total-fabric-kg').textContent = s.totalFabricKg.toFixed(2) + ' kg';
    if ($('res-avg-wt-gms')) $('res-avg-wt-gms').textContent = s.avgWeightGms.toFixed(1) + ' gms';
    if ($('res-pcs-per-kg')) $('res-pcs-per-kg').textContent = (s.pcsPerKg || (s.avgWeightGms > 0 ? 1000 / s.avgWeightGms : 0)).toFixed(2) + ' pcs/kg';
    if ($('res-fabric-cost-pc')) $('res-fabric-cost-pc').textContent = sym + s.fabricCostPc.toFixed(2) + ' /pc';
    if ($('res-fabric-cost-total')) $('res-fabric-cost-total').textContent = sym + s.totalFabricCost.toFixed(2);

    // SP inputs sync if not currently active
    const spPcInput = $('u-sp-pc');
    const spTotInput = $('u-sp-total');
    const profInput = $('u-profit-pct');

    if (spPcInput && document.activeElement !== spPcInput) {
        spPcInput.value = s.spPc > 0 ? s.spPc.toFixed(2) : '';
    }
    if (spTotInput && document.activeElement !== spTotInput) {
        spTotInput.value = s.totalSales > 0 ? s.totalSales.toFixed(2) : '';
    }
    if (profInput && document.activeElement !== profInput) {
        profInput.value = (s.profitPct !== null && s.profitPct !== undefined) ? s.profitPct.toFixed(1) : '';
    }

    // Profit Bar & Label
    const bar = $('u-profit-bar');
    const lbl = $('u-margin-label');
    if (bar && lbl) {
        const pct = s.profitPct || 0;
        const clampedWidth = Math.max(0, Math.min(100, pct));
        bar.style.width = clampedWidth + '%';
        lbl.textContent = `${pct.toFixed(1)}% (${sym}${s.profitDone.toFixed(0)} total profit)`;
        
        if (pct < 0) {
            bar.classList.remove('bg-primary', 'bg-[#34C759]');
            bar.classList.add('bg-error');
            lbl.className = 'font-bold text-error';
        } else if (pct >= 25) {
            bar.classList.remove('bg-error', 'bg-primary');
            bar.classList.add('bg-[#34C759]');
            lbl.className = 'font-bold text-[#34C759]';
        } else {
            bar.classList.remove('bg-error', 'bg-[#34C759]');
            bar.classList.add('bg-primary');
            lbl.className = 'font-bold text-primary';
        }
    }

    // Floating Dynamic Island Bottom Bar
    if ($('result-cp')) $('result-cp').textContent = sym + (s.cpPc > 0 ? s.cpPc.toFixed(2) : '0.00');
    if ($('result-sp')) $('result-sp').textContent = sym + (s.spPc > 0 ? s.spPc.toFixed(2) : '0.00');
    if ($('result-profit-pct')) {
        const pVal = s.profitPct || 0;
        $('result-profit-pct').textContent = pVal.toFixed(1) + '%';
        $('result-profit-pct').className = `text-[19px] font-bold transition-all duration-300 ${pVal >= 0 ? 'text-[#34C759]' : 'text-error'}`;
    }
    if ($('result-total-cost')) $('result-total-cost').textContent = sym + (s.totalCost > 0 ? s.totalCost.toFixed(2) : '0.00');
    if ($('result-total-sales')) $('result-total-sales').textContent = sym + (s.totalSales > 0 ? s.totalSales.toFixed(2) : '0.00');
    if ($('result-profit-done')) {
        $('result-profit-done').textContent = sym + s.profitDone.toFixed(2);
        $('result-profit-done').className = `text-[12px] font-bold ${s.profitDone >= 0 ? 'text-[#34C759]' : 'text-error'}`;
    }

    // Breakdown Visualizer
    renderBreakdown();
}

// ══════════════════════════════════════════════════════
//  DUAL INPUT TWO-WAY FIELD SYNCHRONIZER
// ══════════════════════════════════════════════════════
window.syncField = function(pcId, totalId, source) {
    const s = store.state;
    const qty = s.totalQty || 1;
    const pcEl = $(pcId);
    const totalEl = $(totalId);

    if (!pcEl || !totalEl) return;

    if (source === 'pc') {
        const val = parseFloat(pcEl.value) || 0;
        totalEl.value = (val > 0 && qty > 0) ? (val * qty).toFixed(2) : '';
    } else {
        const total = parseFloat(totalEl.value) || 0;
        pcEl.value = (total > 0 && qty > 0) ? (total / qty).toFixed(2) : '';
    }

    recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  3-WAY SELLING PRICE & PROFIT REACTIVITY
// ══════════════════════════════════════════════════════
window.onUSPChange = function(field) {
    const s = store.state;
    store.update({ lastEdited: field });

    if (field === 'pct') {
        const pct = parseFloat($('u-profit-pct')?.value) || 0;
        store.update({ profitPct: pct });
    } else if (field === 'sp-pc') {
        const sp = parseFloat($('u-sp-pc')?.value) || 0;
        store.update({ spPc: sp });
    } else if (field === 'sp-total') {
        const totalSP = parseFloat($('u-sp-total')?.value) || 0;
        const sp = s.totalQty > 0 ? totalSP / s.totalQty : 0;
        store.update({ spPc: sp });
    }

    recalcAdvanced();
};

// ══════════════════════════════════════════════════════
//  VISUAL COST BREAKDOWN BAR & LEGEND
// ══════════════════════════════════════════════════════
function renderBreakdown() {
    const barEl = $('u-breakdown-bar');
    const legendEl = $('u-breakdown-legend');
    const wrapEl = $('u-breakdown');
    const totalEl = $('u-breakdown-total');

    if (!barEl || !legendEl || !wrapEl) return;

    const s = store.state;
    const sym = s.currency || '₹';
    const totalCost = s.totalCost || 0;

    if (totalCost <= 0) {
        wrapEl.classList.add('hidden');
        wrapEl.classList.remove('flex');
        return;
    }

    wrapEl.classList.remove('hidden');
    wrapEl.classList.add('flex');
    if (totalEl) totalEl.textContent = `${sym}${totalCost.toFixed(2)} total cost`;

    const cmtTotal = s.cmtMode === 'combined' ? (s.cmt * s.totalQty) : ((s.cutting + s.fusing + s.wages + s.packing) * s.totalQty);
    const printingTotal = (s.printing + s.sublimation) * s.totalQty;
    const accTotal = s.acc1 + s.acc2 + s.acc3 + s.pattern;
    const allowTotal = (s.allowances + s.overheads) * s.totalQty;

    const segments = [
        { label: 'Fabric', val: s.totalFabricCost, color: C.fabric },
        { label: 'Making / CMT', val: cmtTotal, color: C.cmt },
        { label: 'Printing & Sub', val: printingTotal, color: C.printing },
        { label: 'Accessories & Pattern', val: accTotal, color: C.accessories },
        { label: 'Allowances & Overheads', val: allowTotal, color: C.overheads }
    ].filter(x => x.val > 0);

    // Render multi-segment bar
    barEl.innerHTML = segments.map(seg => {
        const pct = ((seg.val / totalCost) * 100).toFixed(1);
        return `<div style="width:${pct}%;background:${seg.color}" title="${seg.label}: ${pct}%" class="h-full transition-all"></div>`;
    }).join('');

    // Render legend
    legendEl.innerHTML = segments.map(seg => {
        const pct = ((seg.val / totalCost) * 100).toFixed(1);
        const costPc = s.totalQty > 0 ? (seg.val / s.totalQty).toFixed(2) : '0.00';
        return `
            <div class="flex items-center justify-between text-[13px]">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" style="background:${seg.color}"></span>
                    <span class="font-medium text-on-surface dark:text-slate-200">${seg.label}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-on-surface dark:text-slate-100">${sym}${costPc}/pc</span>
                    <span class="text-[11px] font-semibold text-secondary dark:text-slate-400 bg-surface-container-high dark:bg-slate-800 px-1.5 py-0.5 rounded">${pct}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// ══════════════════════════════════════════════════════
//  CONTROLS: CMT MODE, GARMENTS, CURRENCY, RESET
// ══════════════════════════════════════════════════════
window.toggleSection = function(btn) {
    const body = btn.nextElementSibling;
    const icon = btn.querySelector('.expand-icon');
    if (!body) return;
    const isOpen = !body.style.display || body.style.display === 'none';
    body.style.display = isOpen ? 'flex' : 'none';
    if (icon) icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
};

window.setCMTMode = function(mode) {
    document.querySelectorAll('.cmt-toggle-btn').forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-white');
        b.classList.add('text-secondary', 'bg-surface', 'dark:bg-slate-700');
    });
    event.target.classList.add('active', 'bg-primary', 'text-white');
    event.target.classList.remove('text-secondary', 'bg-surface', 'dark:bg-slate-700');

    $('cmt-combined').style.display = mode === 'combined' ? 'block' : 'none';
    $('cmt-separate').style.display = mode === 'separate' ? 'flex' : 'none';

    store.update({ cmtMode: mode });
    recalcAdvanced();
};

window.selectGarmentType = function(btn) {
    document.querySelectorAll('#adv-garment-chips .garment-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type;
    store.update({ garmentType: type });
    if ($('adv-garment-name') && !$('adv-garment-name').value) {
        $('adv-garment-name').value = `${type}`;
    }
};

window.setCurrency = function(sym) {
    document.querySelectorAll('.currency-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.trim() === sym);
    });
    document.querySelectorAll('.curr-sym').forEach(el => {
        el.textContent = sym;
    });
    store.update({ currency: sym });
    recalcAdvanced();
};

window.resetCalculator = function() {
    if (!confirm('Reset all values to default?')) return;
    store.reset();
    renderSizeGrid();
    syncFormFromStore();
    recalcAdvanced();
    if (window.showToast) window.showToast('Calculator reset', 'info');
};

function syncFormFromStore() {
    const s = store.state;
    const setVal = (id, v) => {
        if ($(id)) {
            $(id).value = (v !== undefined && v !== null && v !== '' && v !== 0 && !isNaN(Number(v))) ? Number(v) : (typeof v === 'string' ? v : '');
        }
    };

    setVal('adv-client', s.clientName);
    setVal('adv-garment-name', s.garmentName);
    setVal('adv-gsm', s.gsm);
    setVal('adv-fabric-price-kg', s.fabricPriceKg);
    setVal('adv-wastage', s.wastage);

    setVal('pat-margin-body', s.bodyLM);
    setVal('pat-margin-chest', s.chestM);
    setVal('pat-margin-slv', s.slvLM);
    setVal('pat-margin-dia', s.slvDiaM);

    setVal('u-cmt', s.cmt);
    setVal('u-cutting', s.cutting);
    setVal('u-fusing', s.fusing);
    setVal('u-wages', s.wages);
    setVal('u-packing', s.packing);

    setVal('u-printing', s.printing);
    setVal('u-sublimation', s.sublimation);
    setVal('u-allowances', s.allowances);
    setVal('u-overheads', s.overheads);

    setVal('u-acc1', s.acc1);
    setVal('u-acc2', s.acc2);
    setVal('u-acc3', s.acc3);
    setVal('u-pattern', s.pattern);

    setVal('u-profit-pct', s.profitPct);
    setVal('u-sp-pc', s.spPc);
    if (s.spPc > 0 && s.totalQty > 0) setVal('u-sp-total', s.spPc * s.totalQty);
}

// ══════════════════════════════════════════════════════
//  SAVE, LOAD & QUOTE PREVIEW
// ══════════════════════════════════════════════════════
window.saveCosting = async function(status = 'saved') {
    if (isSavingCosting) return;
    const s = store.state;
    const clientName = $('adv-client')?.value?.trim() || s.clientName;
    if (!clientName) {
        window.showToast?.('Please enter a Client / Buyer Name', 'error');
        $('adv-client')?.focus();
        return;
    }
    if (s.totalQty <= 0) {
        window.showToast?.('Total quantity must be greater than 0', 'error');
        return;
    }

    const btn = $('btn-save-draft');
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('id');
    isSavingCosting = true;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">${editId ? 'update' : 'save'}</span> ${editId ? 'Updating...' : 'Saving...'}`;
    }

    try {
        const materials = [
            { name: 'Fabric Cost/pc', unit: 'per pc', cost: s.fabricCostPc || 0 },
            { name: 'Fabric Price/kg', unit: 'per kg', cost: s.fabricPriceKg || 0 },
            { name: 'Avg Pcs/kg', unit: 'count', cost: s.pcsPerKg || 0 },
            { name: 'Wastage', unit: '%', cost: s.wastage || 0 },
            { name: 'CMT', unit: 'per pc', cost: s.cmtMode === 'combined' ? (s.cmt || 0) : ((s.cutting || 0) + (s.fusing || 0) + (s.wages || 0) + (s.packing || 0)) },
            { name: 'Printing', unit: 'per pc', cost: (s.printing || 0) + (s.sublimation || 0) },
            { name: 'Accessories', unit: 'lump', cost: (s.acc1 || 0) + (s.acc2 || 0) + (s.acc3 || 0) + (s.pattern || 0) },
            { name: 'Overheads & Allow', unit: 'per pc', cost: (s.allowances || 0) + (s.overheads || 0) }
        ].filter(m => m.cost > 0);

        const payload = {
            id: editId || 'adv_' + Date.now(),
            date: new Date().toISOString(),
            styleRef: s.garmentName || s.garmentType,
            clientId: clientName,
            clientName: clientName,
            garmentType: s.garmentType,
            currency: s.currency || '₹',
            mode: 'advanced',
            qty: s.totalQty || 0,
            pcsPerKg: s.pcsPerKg || 0,
            weightGms: s.avgWeightGms || 0,
            fabricPriceKg: s.fabricPriceKg || 0,
            wastage: s.wastage || 0,
            fabricCostPc: s.fabricCostPc || 0,
            bodyL: s.sizes?.[0]?.bodyL || 0,
            bodyLM: s.bodyLM || 0,
            chest: s.sizes?.[0]?.chest || 0,
            chestM: s.chestM || 0,
            slvL: s.sizes?.[0]?.slvL || 0,
            slvLM: s.slvLM || 0,
            slvDia: s.sizes?.[0]?.slvDia || 0,
            slvDiaM: s.slvDiaM || 0,
            gsm: s.gsm || 0,
            cmtMode: s.cmtMode || 'combined',
            cmt: s.cmt || 0,
            cutting: s.cutting || 0,
            fusing: s.fusing || 0,
            wages: s.wages || 0,
            packing: s.packing || 0,
            printing: s.printing || 0,
            sublimation: s.sublimation || 0,
            allowances: s.allowances || 0,
            overheads: s.overheads || 0,
            acc1: s.acc1 || 0,
            acc2: s.acc2 || 0,
            acc3: s.acc3 || 0,
            pattern: s.pattern || 0,
            totalCost: s.totalCost || 0,
            profitPct: s.profitPct || 0,
            totalSales: s.totalSales || 0,
            profitDone: s.profitDone || 0,
            lastEdited: s.lastEdited || null,
            patternCalcOpen: 1,
            totalUnitCost: s.cpPc || 0,
            retailPrice: s.spPc || 0,
            status: status,
            materials: materials,
            uData: { ...s, clientName, qty: s.totalQty, cp: s.cpPc, sp: s.spPc, profitDone: s.profitDone, lastEdited: s.lastEdited || null }
        };

        if (editId) {
            await api.updateCosting(editId, payload);
        } else {
            await api.saveCosting(payload);
        }

        window.showToast?.(`Costing successfully ${editId ? 'updated' : 'saved'}!`, 'success');
        sessionStorage.removeItem('gos_calc_v2_draft');
        setTimeout(() => { window.location.href = 'costings.html'; }, 600);

    } catch (err) {
        console.error('Save Costing Error:', err);
        window.showToast?.('Failed to save costing: ' + (err.message || 'Unknown error'), 'error');
        if (btn) {
            btn.disabled = false;
            applyEditMode(editId);
        }
        isSavingCosting = false;
    }
};

async function loadCostingById(id) {
    try {
        window.showToast?.('Loading saved costing...', 'info');
        const c = await api.getCostingById(id);
        if (!c || c.error) throw new Error(c?.error || 'Costing not found');

        let u = {};
        if (c.uData && typeof c.uData === 'object') {
            u = { ...c.uData };
        } else if (typeof c.uData === 'string' && c.uData) {
            try { u = JSON.parse(c.uData); } catch (_) {}
        }

        const parsedSizes = u.sizes && Array.isArray(u.sizes) && u.sizes.length ? u.sizes.map(sz => ({
            ...sz,
            qty: parseFloat(sz.qty) || 0,
            bodyL: parseFloat(sz.bodyL) || 0,
            chest: parseFloat(sz.chest) || 0,
            slvL: parseFloat(sz.slvL) || 0,
            slvDia: parseFloat(sz.slvDia) || 0,
            weightGms: parseFloat(sz.weightGms) || 0,
            totalKg: parseFloat(sz.totalKg) || 0,
        })) : store.state.sizes;

        const savedSp = (u.spPc !== undefined && u.spPc !== null) ? parseFloat(u.spPc) : ((u.sp !== undefined && u.sp !== null) ? parseFloat(u.sp) : (c.retailPrice !== undefined && c.retailPrice !== null ? parseFloat(c.retailPrice) : null));
        const savedPct = (u.profitPct !== undefined && u.profitPct !== null) ? parseFloat(u.profitPct) : (c.profitPct !== undefined && c.profitPct !== null ? parseFloat(c.profitPct) : null);
        const inferredLastEdited = u.lastEdited || (savedSp !== null && savedSp > 0 ? 'sp-pc' : (savedPct !== null ? 'pct' : 'pct'));

        store.update({
            clientName: c.clientId || c.clientName || u.clientName || '',
            garmentName: c.styleRef || u.garmentName || '',
            garmentType: c.garmentType || u.garmentType || 'T-Shirt',
            currency: c.currency || u.currency || '₹',
            sizes: parsedSizes,
            gsm: parseFloat(u.gsm ?? c.gsm ?? 0),
            fabricPriceKg: parseFloat(u.fabricPriceKg ?? c.fabricPriceKg ?? 0),
            wastage: parseFloat(u.wastage ?? c.wastage ?? 0),
            cmtMode: u.cmtMode || c.cmtMode || 'combined',
            cmt: parseFloat(u.cmt ?? c.cmt ?? 0),
            cutting: parseFloat(u.cutting ?? c.cutting ?? 0),
            fusing: parseFloat(u.fusing ?? c.fusing ?? 0),
            wages: parseFloat(u.wages ?? c.wages ?? 0),
            packing: parseFloat(u.packing ?? c.packing ?? 0),
            printing: parseFloat(u.printing ?? c.printing ?? 0),
            sublimation: parseFloat(u.sublimation ?? c.sublimation ?? 0),
            acc1: parseFloat(u.acc1 ?? c.acc1 ?? 0),
            acc2: parseFloat(u.acc2 ?? c.acc2 ?? 0),
            acc3: parseFloat(u.acc3 ?? c.acc3 ?? 0),
            pattern: parseFloat(u.pattern ?? c.pattern ?? 0),
            allowances: parseFloat(u.allowances ?? c.allowances ?? 0),
            overheads: parseFloat(u.overheads ?? c.overheads ?? 0),
            profitPct: savedPct,
            spPc: savedSp,
            cpPc: parseFloat(u.cpPc ?? u.cp ?? c.totalUnitCost ?? 0),
            lastEdited: inferredLastEdited,
            bodyLM: parseFloat(u.bodyLM ?? c.bodyLM ?? 0) || 2.5,
            chestM: parseFloat(u.chestM ?? c.chestM ?? 0) || 1.5,
            slvLM: parseFloat(u.slvLM ?? c.slvLM ?? 0) || 1.5,
            slvDiaM: parseFloat(u.slvDiaM ?? c.slvDiaM ?? 0) || 1.5,
        });

        renderSizeGrid();
        syncFormFromStore();
        recalcAdvanced();
        window.showToast?.('Costing loaded', 'success');

    } catch (e) {
        console.error('Error loading costing:', e);
        window.showToast?.('Could not load costing', 'error');
    }
}

function restoreDraftSession() {
    try {
        const raw = sessionStorage.getItem('gos_calc_v2_draft');
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d && d.u) {
            store.update(d.u);
            if (d.sharedClient) store.update({ clientName: d.sharedClient });
        }
    } catch (_) {}
}

function initSheets() {
    const sheetsContainer = $('sheets-container');
    if (!sheetsContainer) return;

    const quoteContent = `<div id="quote-preview-body" class="min-h-[180px]"><div class="p-8 text-center text-secondary text-[14px]">Fill in costs to preview</div></div>`;
    const quoteFooter = `
        <button onclick="downloadQuotePDF()" class="w-full bg-primary text-on-primary font-bold text-[15px] py-3.5 rounded-2xl active-scale transition-apple shadow-sm flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[20px]">picture_as_pdf</span> Download / Print PDF
        </button>
        
        <div class="grid grid-cols-2 gap-2 w-full mt-2">
            <button onclick="copyQuoteToClipboard()" class="bg-surface-container-high text-on-surface font-semibold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">content_copy</span> Copy
            </button>
            <button onclick="shareQuoteViaWhatsApp()" class="bg-[#25D366] text-white font-semibold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5 shadow-sm">
                <span class="material-symbols-outlined text-[18px]">share</span> WhatsApp
            </button>
            <button onclick="convertToOrder()" class="bg-surface-container-high text-on-surface font-semibold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">shopping_cart</span> Order
            </button>
            <button id="quote-save-costing" onclick="saveCosting('draft'); window.closeSheet('quotePreviewSheet');" class="bg-surface-container-high text-on-surface font-semibold text-[14px] py-3 rounded-xl active-scale transition-apple flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">save</span> Save
            </button>
        </div>
    `;

    sheetsContainer.innerHTML = BottomSheet({
        id: 'quotePreviewSheet',
        title: 'Quote Preview',
        content: quoteContent,
        footerContent: quoteFooter,
        height: '85vh'
    });
}

window.openQuotePreview = function() {
    const s = store.state;
    const client = s.clientName || $('adv-client')?.value?.trim() || '—';
    const garment = s.garmentName || s.garmentType || 'Garment';
    const sym = s.currency || '₹';

    if (s.totalQty <= 0) {
        window.showToast?.('Add size quantities before previewing quote', 'error');
        return;
    }
    if (s.cpPc <= 0) {
        window.showToast?.('Fill in costs before generating a quote', 'error');
        return;
    }

    const body = $('quote-preview-body');
    if (!body) return;

    // Active sizes breakdown
    const activeSizes = s.sizes.filter(sz => sz.qty > 0);
    const sizesHTML = activeSizes.map(sz => `
        <div class="flex items-center justify-between py-2 border-b border-outline-variant/15 text-[13px] last:border-0">
            <span class="font-bold text-on-surface">${sz.name}</span>
            <div class="flex items-center gap-3 tabular-nums">
                <span class="text-secondary font-medium">${sz.qty} pcs</span>
                <span class="text-secondary font-medium">${sz.weightGms.toFixed(1)} g <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">(${sz.weightGms > 0 ? (1000 / sz.weightGms).toFixed(1) : 0} p/kg)</span></span>
                <span class="font-bold text-primary">${sz.totalKg.toFixed(2)} kg</span>
            </div>
        </div>
    `).join('') || '<p class="text-secondary text-[12px] py-2">No size quantities entered.</p>';

    const cmtTotal = s.cmtMode === 'combined' ? (s.cmt * s.totalQty) : ((s.cutting + s.fusing + s.wages + s.packing) * s.totalQty);
    const printingTotal = (s.printing + s.sublimation) * s.totalQty;
    const accTotal = s.acc1 + s.acc2 + s.acc3 + s.pattern;
    const allowTotal = (s.allowances + s.overheads) * s.totalQty;

    body.innerHTML = `
        <div class="bg-white/60 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/60 dark:border-slate-700 shadow-xl shadow-black/[0.03] rounded-3xl p-5 mb-4 relative overflow-hidden">
            <div class="flex justify-between items-start mb-5 relative z-10">
                <div>
                    <p class="text-[11px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Advanced Costing Quote</p>
                    <h2 class="text-[20px] font-bold text-on-surface dark:text-white leading-tight tracking-tight">${client !== '—' ? client : garment}</h2>
                    <p class="text-[13px] text-secondary dark:text-slate-400 mt-1 font-medium">${s.totalQty.toLocaleString()} pcs · ${garment} (${s.garmentType})</p>
                </div>
                <div class="w-11 h-11 bg-white dark:bg-slate-700 border border-white dark:border-slate-600 shadow-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-primary dark:text-blue-400 text-[20px]">receipt_long</span>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2 relative z-10">
                <div class="bg-white/80 dark:bg-slate-900/60 border border-white/50 dark:border-slate-700 rounded-2xl p-3 text-center shadow-sm">
                    <p class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">CP / pc</p>
                    <p class="text-[15px] font-black text-on-surface dark:text-white">${sym}${s.cpPc.toFixed(2)}</p>
                </div>
                <div class="bg-primary/10 border border-primary/15 rounded-2xl p-3 text-center shadow-sm">
                    <p class="text-[10px] font-bold text-primary dark:text-blue-400 uppercase tracking-wider mb-1">SP / pc</p>
                    <p class="text-[15px] font-black text-primary dark:text-blue-400">${s.spPc > 0 ? sym + s.spPc.toFixed(2) : '—'}</p>
                </div>
                <div class="bg-white/80 dark:bg-slate-900/60 border border-white/50 dark:border-slate-700 rounded-2xl p-3 text-center shadow-sm">
                    <p class="text-[10px] font-bold text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Profit %</p>
                    <p class="text-[15px] font-black ${s.profitPct >= 0 ? 'text-[#34C759]' : 'text-error'}">${s.profitPct !== null && s.profitPct !== undefined ? s.profitPct.toFixed(1) + '%' : '—'}</p>
                </div>
            </div>
        </div>

        <!-- Total Financials -->
        <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-surface-container-lowest dark:bg-slate-800/60 border border-outline-variant/30 rounded-2xl p-3 text-center">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase mb-1">Total Cost</p>
                <p class="text-[14px] font-bold text-on-surface dark:text-white">${sym}${s.totalCost.toFixed(2)}</p>
            </div>
            <div class="bg-surface-container-lowest dark:bg-slate-800/60 border border-outline-variant/30 rounded-2xl p-3 text-center">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase mb-1">Total Revenue</p>
                <p class="text-[14px] font-bold text-primary dark:text-blue-400">${s.totalSales > 0 ? sym + s.totalSales.toFixed(2) : '—'}</p>
            </div>
            <div class="bg-surface-container-lowest dark:bg-slate-800/60 border border-outline-variant/30 rounded-2xl p-3 text-center">
                <p class="text-[10px] font-semibold text-secondary dark:text-slate-400 uppercase mb-1">Net Profit</p>
                <p class="text-[14px] font-bold ${s.profitDone >= 0 ? 'text-[#34C759]' : 'text-error'}">${s.totalSales > 0 ? sym + s.profitDone.toFixed(2) : '—'}</p>
            </div>
        </div>

        <!-- Size Breakdown Card -->
        <div class="bg-white/70 dark:bg-slate-800/70 border border-outline-variant/30 rounded-2xl p-4 mb-4">
            <div class="flex justify-between items-center mb-3">
                <h4 class="text-[12px] font-bold text-secondary dark:text-slate-300 uppercase tracking-wider">Size Run &amp; Fabric Consumption</h4>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">${(s.pcsPerKg || (s.avgWeightGms > 0 ? 1000 / s.avgWeightGms : 0)).toFixed(2)} pcs/kg yield</span>
                    <span class="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">${s.totalFabricKg.toFixed(2)} kg total</span>
                </div>
            </div>
            <div class="flex flex-col">
                ${sizesHTML}
            </div>
        </div>

        <!-- Cost Modules Card -->
        <div class="bg-white/70 dark:bg-slate-800/70 border border-outline-variant/30 rounded-2xl p-4 mb-4 text-[13px]">
            <h4 class="text-[12px] font-bold text-secondary dark:text-slate-300 uppercase tracking-wider mb-2">Cost Breakdown</h4>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/15">
                <span class="text-secondary">Fabric (${s.gsm} GSM @ ${sym}${s.fabricPriceKg}/kg)</span>
                <span class="font-bold">${sym}${s.fabricCostPc.toFixed(2)}/pc</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/15">
                <span class="text-secondary">Making / CMT (${s.cmtMode})</span>
                <span class="font-bold">${sym}${(cmtTotal / (s.totalQty || 1)).toFixed(2)}/pc</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/15">
                <span class="text-secondary">Printing &amp; Sublimation</span>
                <span class="font-bold">${sym}${(printingTotal / (s.totalQty || 1)).toFixed(2)}/pc</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/15">
                <span class="text-secondary">Accessories &amp; Pattern</span>
                <span class="font-bold">${sym}${(accTotal / (s.totalQty || 1)).toFixed(2)}/pc</span>
            </div>
            <div class="flex justify-between py-1.5">
                <span class="text-secondary">Allowances &amp; Overheads</span>
                <span class="font-bold">${sym}${(allowTotal / (s.totalQty || 1)).toFixed(2)}/pc</span>
            </div>
        </div>

        <p class="text-[11px] text-secondary text-center">
            Generated by Garment OS · ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </p>
        <div class="h-6"></div>
    `;

    window.openSheet('quotePreviewSheet');
};

window.downloadQuotePDF = function() {
    const s = store.state;
    const client = s.clientName || $('adv-client')?.value?.trim() || 'Valued Customer';
    const garment = s.garmentName || s.garmentType || 'Garment';
    const sym = s.currency || '₹';
    const qty = s.totalQty || 0;
    const uLabel = (s.unit || 'cm') === 'in' ? 'in' : 'cm';

    const quoteNo = 'QT-ADV-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        window.showToast?.('Please allow popups to open print preview', 'error');
        return;
    }

    // Sizes Rows
    const activeSizes = s.sizes.filter(sz => sz.qty > 0 || sz.bodyL > 0);
    const sizesRowsHTML = activeSizes.map(sz => `
        <tr>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; font-weight: bold;">${sz.name}</td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${sz.qty}</td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${sz.bodyL > 0 ? sz.bodyL : '—'}</td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${sz.chest > 0 ? sz.chest : '—'}</td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${sz.slvL > 0 ? sz.slvL : '—'}</td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: center;">${sz.slvDia > 0 ? sz.slvDia : '—'}</td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: right;">${sz.weightGms.toFixed(1)} g<br><span style="font-size: 10px; color: #6B7280;">(${(sz.weightGms > 0 ? 1000 / sz.weightGms : 0).toFixed(1)} p/kg)</span></td>
            <td style="padding: 9px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: bold;">${sz.totalKg.toFixed(2)} kg</td>
        </tr>
    `).join('');

    // CMT details
    const isSep = s.cmtMode === 'separate';
    const cmtTotalVal = isSep ? ((s.cutting + s.fusing + s.wages + s.packing) * qty) : (s.cmt * qty);
    const cmtUnitVal = isSep ? (s.cutting + s.fusing + s.wages + s.packing) : s.cmt;

    const cmtDetailsHTML = isSep ? `
        <tr>
            <td style="padding: 8px 10px 8px 24px; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 12px;">↳ Cutting</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${s.cutting.toFixed(2)}/pc</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${(s.cutting * qty).toFixed(2)}</td>
        </tr>
        <tr>
            <td style="padding: 8px 10px 8px 24px; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 12px;">↳ Fusing</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${s.fusing.toFixed(2)}/pc</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${(s.fusing * qty).toFixed(2)}</td>
        </tr>
        <tr>
            <td style="padding: 8px 10px 8px 24px; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 12px;">↳ Stitching Wages</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${s.wages.toFixed(2)}/pc</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${(s.wages * qty).toFixed(2)}</td>
        </tr>
        <tr>
            <td style="padding: 8px 10px 8px 24px; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 12px;">↳ Packing</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${s.packing.toFixed(2)}/pc</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 12px;">${sym}${(s.packing * qty).toFixed(2)}</td>
        </tr>
    ` : '';

    const printingTotal = (s.printing + s.sublimation) * qty;
    const accTotal = s.acc1 + s.acc2 + s.acc3 + s.pattern;
    const allowTotal = (s.allowances + s.overheads) * qty;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Garment OS - Quotation ${quoteNo}</title>
            <style>
                body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; padding: 36px; line-height: 1.45; background: #fff; margin: 0; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0071E3; padding-bottom: 16px; margin-bottom: 24px; }
                .brand { font-size: 24px; font-weight: 900; color: #0071E3; letter-spacing: -0.5px; margin: 0; }
                .tagline { font-size: 12px; color: #6B7280; margin: 3px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .quote-badge { text-align: right; }
                .quote-title { margin: 0; font-size: 18px; font-weight: 800; color: #111827; }
                .quote-meta { margin: 3px 0 0 0; font-size: 12px; color: #4B5563; }
                
                .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-bottom: 24px; background: #F9FAFB; padding: 16px 20px; border-radius: 12px; border: 1px solid #E5E7EB; }
                .info-col h3 { font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 0.5px; }
                .info-col p { margin: 3px 0; font-size: 13px; color: #1F2937; }
                
                .section-header { font-size: 13px; text-transform: uppercase; font-weight: 800; color: #374151; margin: 20px 0 10px 0; border-bottom: 1.5px solid #E5E7EB; padding-bottom: 6px; letter-spacing: 0.5px; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                th { background-color: #F3F4F6; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #374151; border-bottom: 1.5px solid #D1D5DB; text-transform: uppercase; }
                td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
                
                .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
                .metric-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; text-align: center; }
                .metric-card.highlight { background: #EFF6FF; border-color: #BFDBFE; }
                .metric-card p { margin: 0; font-size: 10px; text-transform: uppercase; color: #6B7280; font-weight: 700; }
                .metric-card h4 { margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #111827; }
                .metric-card.highlight h4 { color: #0071E3; }
                
                .fabric-spec-box { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; margin-bottom: 20px; font-size: 11px; }
                .fabric-spec-item { text-align: center; }
                .fabric-spec-item span { display: block; color: #6B7280; text-transform: uppercase; font-size: 9px; font-weight: 700; margin-bottom: 2px; }
                .fabric-spec-item strong { font-size: 13px; color: #111827; }
                
                .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #D1D5DB; }
                .sign-box { text-align: center; }
                .sign-line { border-bottom: 1px solid #9CA3AF; height: 35px; margin-bottom: 6px; }
                .sign-box p { margin: 0; font-size: 11px; color: #6B7280; font-weight: 600; text-transform: uppercase; }

                .footer { text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 12px; }
                
                .btn-bar { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 20px; }
                .btn-print { background: #0071E3; color: white; border: none; padding: 9px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
                .btn-close { background: #E5E7EB; color: #374151; border: none; padding: 9px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }

                @media print {
                    @page { size: A4 portrait; margin: 12mm; }
                    body { padding: 0; font-size: 11px !important; }
                    .btn-bar { display: none !important; }
                    .header { margin-bottom: 16px; padding-bottom: 10px; }
                    .info-grid { margin-bottom: 16px; padding: 10px 14px; }
                    .metrics-grid { margin-bottom: 16px; gap: 10px; }
                    .metric-card { padding: 8px; }
                    .metric-card h4 { font-size: 15px; }
                    table { margin-bottom: 16px; font-size: 11px; }
                    th, td { padding: 5px 6px !important; }
                    .fabric-spec-box { margin-bottom: 16px; padding: 8px; }
                    .sign-grid { margin-top: 25px; }
                    .footer { margin-top: 20px; }
                    tr { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="btn-bar no-print">
                <button class="btn-close" onclick="window.close()">Close</button>
                <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            </div>

            <div class="header">
                <div>
                    <h1 class="brand">GARMENT OS</h1>
                    <p class="tagline">BOM &amp; Multi-Size Production Quotation</p>
                </div>
                <div class="quote-badge">
                    <h2 class="quote-title">Costing Quote</h2>
                    <p class="quote-meta"><strong>No:</strong> ${quoteNo}</p>
                    <p class="quote-meta"><strong>Date:</strong> ${dateStr}</p>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-col">
                    <h3>Client &amp; Garment Profile</h3>
                    <p><strong>Client / Buyer:</strong> ${client}</p>
                    <p><strong>Style Name:</strong> ${garment}</p>
                    <p><strong>Category:</strong> ${s.garmentType}</p>
                    <p><strong>Total Quantity:</strong> ${qty.toLocaleString()} pcs</p>
                </div>
                <div class="info-col">
                    <h3>Technical Specifications</h3>
                    <p><strong>Measurement Unit:</strong> ${s.unit === 'in' ? 'Inches (in)' : 'Centimeters (cm)'}</p>
                    <p><strong>Seam Margins:</strong> Body +${s.bodyLM || 0}, Chest +${s.chestM || 0}, Sleeve +${s.slvLM || 0}</p>
                    <p><strong>Currency:</strong> ${sym} (${sym === '₹' ? 'INR' : sym === '$' ? 'USD' : 'EUR'})</p>
                    <p><strong>Document Status:</strong> Official Quotation</p>
                </div>
            </div>

            <div class="section-header">1. Size-by-Size Pattern &amp; Fabric Consumption</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 14%;">Size</th>
                        <th style="width: 12%; text-align: center;">Qty (pcs)</th>
                        <th style="width: 13%; text-align: center;">Body L (${uLabel})</th>
                        <th style="width: 13%; text-align: center;">Chest (${uLabel})</th>
                        <th style="width: 12%; text-align: center;">Slv L (${uLabel})</th>
                        <th style="width: 12%; text-align: center;">Dia (${uLabel})</th>
                        <th style="width: 12%; text-align: right;">Weight / pc</th>
                        <th style="width: 12%; text-align: right;">Total Fabric</th>
                    </tr>
                </thead>
                <tbody>
                    ${sizesRowsHTML}
                    <tr style="font-weight: bold; background-color: #F9FAFB; border-top: 1.5px solid #D1D5DB;">
                        <td style="padding: 10px;">Total / Average</td>
                        <td style="text-align: center; color: #0071E3;">${qty.toLocaleString()} pcs</td>
                        <td colspan="4" style="text-align: center; color: #6B7280; font-size: 11px;">(Margins Included)</td>
                        <td style="text-align: right;">${s.avgWeightGms.toFixed(1)} g<br><span style="font-size: 10px; color: #0071E3;">(${(s.pcsPerKg || (s.avgWeightGms > 0 ? 1000 / s.avgWeightGms : 0)).toFixed(2)} pcs/kg)</span></td>
                        <td style="text-align: right; color: #0071E3;">${s.totalFabricKg.toFixed(2)} kg</td>
                    </tr>
                </tbody>
            </table>

            <div class="fabric-spec-box">
                <div class="fabric-spec-item">
                    <span>Fabric GSM</span>
                    <strong>${s.gsm > 0 ? s.gsm + ' gsm' : '—'}</strong>
                </div>
                <div class="fabric-spec-item">
                    <span>Price / kg</span>
                    <strong>${sym}${s.fabricPriceKg.toFixed(2)}</strong>
                </div>
                <div class="fabric-spec-item">
                    <span>Avg Yield (Pcs/Kg)</span>
                    <strong style="color: #0071E3;">${(s.pcsPerKg || (s.avgWeightGms > 0 ? 1000 / s.avgWeightGms : 0)).toFixed(2)} pcs/kg</strong>
                </div>
                <div class="fabric-spec-item">
                    <span>Cutting Wastage</span>
                    <strong>${s.wastage}%</strong>
                </div>
                <div class="fabric-spec-item">
                    <span>Fabric Cost / pc</span>
                    <strong>${sym}${s.fabricCostPc.toFixed(2)}</strong>
                </div>
            </div>

            <div class="section-header">2. Bill of Materials (BOM) &amp; Manufacturing Cost Breakdown</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Cost Element</th>
                        <th style="width: 25%; text-align: right;">Rate / Piece</th>
                        <th style="width: 25%; text-align: right;">Total Order Cost</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight: 600;">Fabric Cost (${s.totalFabricKg.toFixed(2)} kg @ ${sym}${s.fabricPriceKg}/kg)</td>
                        <td style="text-align: right;">${sym}${s.fabricCostPc.toFixed(2)}/pc</td>
                        <td style="text-align: right;">${sym}${s.totalFabricCost.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 600;">Making / CMT (${s.cmtMode})</td>
                        <td style="text-align: right;">${sym}${cmtUnitVal.toFixed(2)}/pc</td>
                        <td style="text-align: right;">${sym}${cmtTotalVal.toFixed(2)}</td>
                    </tr>
                    ${cmtDetailsHTML}
                    <tr>
                        <td style="font-weight: 600;">Printing &amp; Sublimation</td>
                        <td style="text-align: right;">${sym}${(printingTotal / (qty || 1)).toFixed(2)}/pc</td>
                        <td style="text-align: right;">${sym}${printingTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 600;">Accessories, Trims &amp; Master Pattern</td>
                        <td style="text-align: right;">${sym}${(accTotal / (qty || 1)).toFixed(2)}/pc</td>
                        <td style="text-align: right;">${sym}${accTotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 600;">Allowances &amp; Factory Overheads</td>
                        <td style="text-align: right;">${sym}${(allowTotal / (qty || 1)).toFixed(2)}/pc</td>
                        <td style="text-align: right;">${sym}${allowTotal.toFixed(2)}</td>
                    </tr>
                    <tr style="font-weight: bold; background-color: #F9FAFB; border-top: 2px solid #D1D5DB;">
                        <td style="padding: 10px; font-size: 13px;">Total Manufacturing Cost (CP)</td>
                        <td style="text-align: right; font-size: 13px; color: #111827;">${sym}${s.cpPc.toFixed(2)}/pc</td>
                        <td style="text-align: right; font-size: 13px; color: #111827;">${sym}${s.totalCost.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-header">3. Pricing &amp; Commercial Summary</div>
            
            <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Per Piece Metrics</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <p>Unit Cost Price (CP)</p>
                    <h4>${sym}${s.cpPc.toFixed(2)}</h4>
                </div>
                <div class="metric-card highlight">
                    <p>Quoted Selling Price (SP)</p>
                    <h4>${s.spPc > 0 ? sym + s.spPc.toFixed(2) : '—'}</h4>
                </div>
                <div class="metric-card">
                    <p>Unit Profit / Margin</p>
                    <h4 style="color: #0071E3;">${s.spPc > 0 ? sym + (s.spPc - s.cpPc).toFixed(2) : '—'} <span style="font-size: 12px; font-weight: normal; color: #6B7280;">(${s.profitPct !== null ? s.profitPct.toFixed(1) + '%' : '—'})</span></h4>
                </div>
            </div>

            <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #6B7280; font-weight: 700;">Order Financial Totals (${qty.toLocaleString()} pcs)</p>
            <div class="metrics-grid">
                <div class="metric-card">
                    <p>Total Production Cost</p>
                    <h4>${sym}${s.totalCost.toFixed(2)}</h4>
                </div>
                <div class="metric-card highlight">
                    <p>Total Sales Value</p>
                    <h4>${s.totalSales > 0 ? sym + s.totalSales.toFixed(2) : '—'}</h4>
                </div>
                <div class="metric-card">
                    <p>Projected Net Profit</p>
                    <h4 style="color: #008A00;">${s.totalSales > 0 ? sym + s.profitDone.toFixed(2) : '—'}</h4>
                </div>
            </div>

            <div class="sign-grid">
                <div class="sign-box">
                    <div class="sign-line"></div>
                    <p>Authorized Signature &amp; Seal</p>
                </div>
                <div class="sign-box">
                    <div class="sign-line"></div>
                    <p>Client Acceptance &amp; Confirmation</p>
                </div>
            </div>

            <div class="footer">
                <p>This quotation is generated by Garment OS and is valid for 30 calendar days from the date of issue. Production begins upon receipt of purchase order and advance payment.</p>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 400);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.shareQuoteViaWhatsApp = function() {
    const s = store.state;
    const client = s.clientName || $('adv-client')?.value?.trim() || '—';
    const garment = s.garmentName || s.garmentType || 'Garment';
    const sym = s.currency || '₹';

    const activeSizes = s.sizes.filter(sz => sz.qty > 0);
    const sizeRunStr = activeSizes.map(sz => `${sz.name}: ${sz.qty}`).join(', ') || 'N/A';

    const lines = [
        '📊 *Garment OS Advanced Costing Quote*',
        `👔 *Client:* ${client}`,
        `👕 *Garment:* ${garment} (${s.garmentType})`,
        s.totalQty > 0 ? `📦 *Total Qty:* ${s.totalQty.toLocaleString()} pcs` : '',
        `📏 *Sizes:* ${sizeRunStr}`,
        `🧵 *Fabric Required:* ${s.totalFabricKg.toFixed(2)} kg (${s.gsm} GSM)`,
        `💰 *Cost Price (CP):* ${sym}${s.cpPc.toFixed(2)}/pc`,
        s.spPc > 0 ? `🏷 *Selling Price (SP):* ${sym}${s.spPc.toFixed(2)}/pc` : '',
        s.profitPct !== null ? `📈 *Profit Margin:* ${s.profitPct.toFixed(1)}%` : '',
        s.totalCost > 0 ? `💼 *Total Order Cost:* ${sym}${s.totalCost.toFixed(2)}` : '',
        s.totalSales > 0 ? `💵 *Total Revenue:* ${sym}${s.totalSales.toFixed(2)}` : '',
        '',
        '_Generated by Garment OS Advanced BOM Engine_',
    ].filter(Boolean).join('\n');

    const url = 'https://wa.me/?text=' + encodeURIComponent(lines);
    window.open(url, '_blank');
};

window.copyQuoteToClipboard = function() {
    const s = store.state;
    const client = s.clientName || $('adv-client')?.value?.trim() || '—';
    const garment = s.garmentName || s.garmentType || 'Garment';
    const sym = s.currency || '₹';

    const activeSizes = s.sizes.filter(sz => sz.qty > 0);
    const sizeRunStr = activeSizes.map(sz => `${sz.name}: ${sz.qty}`).join(', ') || 'N/A';

    const lines = [
        '📋 Garment OS Advanced Quote',
        `Client: ${client}`,
        `Garment: ${garment} (${s.garmentType})`,
        s.totalQty > 0 ? `Total Qty: ${s.totalQty.toLocaleString()} pcs` : '',
        `Sizes: ${sizeRunStr}`,
        `Fabric: ${s.totalFabricKg.toFixed(2)} kg (${s.gsm} GSM)`,
        `CP/pc: ${sym}${s.cpPc.toFixed(2)}`,
        `SP/pc: ${s.spPc > 0 ? sym + s.spPc.toFixed(2) : 'Not set'}`,
        `Profit: ${s.profitPct !== null ? s.profitPct.toFixed(1) + '%' : 'Not set'}`,
        s.totalSales > 0 ? `Total Sales: ${sym}${s.totalSales.toFixed(2)}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines)
        .then(() => window.showToast?.('Quote copied to clipboard!', 'success'))
        .catch(() => window.showToast?.('Could not copy — please select manually', 'error'));
};

window.convertToOrder = function() {
    const s = store.state;
    const client = s.clientName || $('adv-client')?.value?.trim() || '';
    try {
        sessionStorage.setItem('gos_order_draft', JSON.stringify({
            client,
            garmentType: s.garmentName || s.garmentType,
            qty: s.totalQty,
            cp: s.cpPc,
            sp: s.spPc,
            sizes: s.sizes.filter(sz => sz.qty > 0)
        }));
    } catch (_) {}
    window.closeSheet?.('quotePreviewSheet');
    window.showToast?.('Opening Order page with your costing…', 'success');
    setTimeout(() => {
        window.location.href = 'orders.html?from=costing';
    }, 900);
};
