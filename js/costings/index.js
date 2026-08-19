import { api } from '../services/api.js';

const $ = (id) => document.getElementById(id);

async function loadCostings() {
    const listEl = $('costings-list');
    const emptyState = $('empty-state');
    const loadingState = $('loading-state');

    if (!listEl || !emptyState || !loadingState) return;

    listEl.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
        const costings = await api.getCostings();

        loadingState.classList.add('hidden');

        if (!costings || costings.length === 0 || costings.error) {
            emptyState.classList.remove('hidden');
            return;
        }

        listEl.classList.remove('hidden');
        listEl.innerHTML = costings.map(c => {
            const date = new Date(c.createdAt || c.date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const cp = c.totalUnitCost || 0;
            const sp = c.retailPrice || 0;
            const profit = (cp > 0 && sp > 0) ? (((sp - cp) / cp) * 100).toFixed(1) + '%' : '—';
            const profitClass = (cp > 0 && sp > 0 && (sp - cp) >= 0) ? 'text-[#34C759]' : 'text-error';

            return `
                <div class="costing-card p-4 flex flex-col gap-3" onclick="openCosting('${c.id}')">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-[16px] font-bold text-on-surface">${c.clientId || 'Unnamed Client'}</h3>
                            <p class="text-[13px] text-secondary">${c.styleRef || 'Garment'}</p>
                        </div>
                        <span class="text-[11px] text-secondary bg-surface-container-high px-2 py-1 rounded-md font-medium">
                            ${date}
                        </span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-outline-variant/30">
                        <div>
                            <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-0.5">CP/pc</p>
                            <p class="text-[14px] font-bold text-on-surface">₹${cp.toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-0.5">SP/pc</p>
                            <p class="text-[14px] font-bold text-primary">₹${sp > 0 ? sp.toFixed(2) : '—'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-0.5">Margin</p>
                            <p class="text-[14px] font-bold ${profitClass}">${profit}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load costings:', err);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        window.showToast?.('Could not load costings', 'error');
    }
}

// Attach to window so onclick works
window.openCosting = async function(id) {
    try {
        window.showToast?.('Loading costing details...', 'info');
        const c = await api.getCostingById(id);
        
        if (c && !c.error) {
            // Clean up any old costing sheets from DOM
            const existing = document.getElementById('costingDetailSheet-overlay');
            if (existing) {
                existing.parentElement.remove();
            }
            
            const materialsList = (c.materials || []).map(m => `
                <div class="flex justify-between items-center py-3 border-b border-outline-variant/30 text-[14px]">
                    <span class="text-secondary font-medium">${m.name}</span>
                    <span class="text-on-surface font-bold">₹${(m.cost || 0).toFixed(2)}</span>
                </div>
            `).join('') || '<p class="text-[14px] text-secondary py-3">No material details saved.</p>';
            
            const cp = c.totalUnitCost || 0;
            const sp = c.retailPrice || 0;
            const profit = (cp > 0 && sp > 0) ? (((sp - cp) / cp) * 100).toFixed(1) + '%' : '—';
            const profitClass = (cp > 0 && sp > 0 && (sp - cp) >= 0) ? 'text-[#34C759]' : 'text-error';
            
            const container = document.createElement('div');
            const sheetId = 'costingDetailSheet';
            
            container.innerHTML = `
                <div id="${sheetId}-overlay" class="bottom-sheet-overlay"></div>
                <div id="${sheetId}-content" class="bottom-sheet-content flex flex-col h-[75vh]">
                    <div class="sheet-handle"></div>
                    <div class="px-lg pb-md flex justify-between items-center border-b border-outline-variant/30">
                        <div>
                            <h2 class="text-[20px] font-bold text-on-surface">${c.clientId || 'Unnamed Client'}</h2>
                            <p class="text-[13px] text-secondary">${c.styleRef || 'Garment'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="costing-delete-btn" class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 active-scale transition-apple hover:bg-red-100">
                                <span class="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                            <button type="button" id="costing-close-x" class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary active-scale transition-apple">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto p-lg flex flex-col gap-5 bg-[#f4f5f7]">
                        <!-- Financial Summary Card -->
                        <div class="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
                            <h3 class="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Summary</h3>
                            <div class="grid grid-cols-3 gap-2">
                                <div class="bg-surface-container-low rounded-xl p-3 text-center">
                                    <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">CP/pc</p>
                                    <p class="text-[14px] font-bold text-on-surface">₹${cp.toFixed(2)}</p>
                                </div>
                                <div class="bg-primary/5 rounded-xl p-3 text-center">
                                    <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">SP/pc</p>
                                    <p class="text-[14px] font-bold text-primary">₹${sp > 0 ? sp.toFixed(2) : '—'}</p>
                                </div>
                                <div class="bg-surface-container-low rounded-xl p-3 text-center">
                                    <p class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">Margin</p>
                                    <p class="text-[14px] font-bold ${profitClass}">${profit}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cost Breakdown Card -->
                        <div class="bg-white border border-outline-variant/30 rounded-2xl p-5 shadow-sm">
                            <h3 class="text-[11px] font-bold text-secondary uppercase tracking-wider mb-2">Cost Breakdown</h3>
                            <div class="flex flex-col">
                                ${materialsList}
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-4 border-t border-outline-variant/30 bg-white safe-bottom flex gap-3">
                        <button type="button" id="costing-close-btn" class="flex-1 bg-surface-container-high text-on-surface font-semibold py-3.5 rounded-xl active-scale transition-apple">
                            Close
                        </button>
                        <button type="button" id="costing-edit-btn" class="flex-1 bg-primary text-white font-semibold py-3.5 rounded-xl shadow-sm active-scale transition-apple flex items-center justify-center gap-1.5">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                            Proceed to Edit
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(container);
            
            const cleanup = () => {
                window.closeSheet(sheetId);
                setTimeout(() => container.remove(), 400);
            };
            
            container.querySelector(`#${sheetId}-overlay`).onclick = cleanup;
            container.querySelector('#costing-close-x').onclick = cleanup;
            container.querySelector('#costing-close-btn').onclick = cleanup;
            
            container.querySelector('#costing-delete-btn').onclick = async () => {
                const confirmed = confirm("Are you sure you want to delete this costing?");
                if (!confirmed) return;
                
                try {
                    window.showToast?.('Deleting costing...', 'info');
                    await api.deleteCosting(c.id);
                    window.showToast?.('Costing deleted successfully', 'success');
                    cleanup();
                    loadCostings();
                } catch (err) {
                    console.error(err);
                    window.showToast?.('Error deleting costing', 'error');
                }
            };
            
            container.querySelector('#costing-edit-btn').onclick = () => {
                const draft = {
                    sharedClient: c.clientId || '',
                    u: {
                        garmentType: c.styleRef || 'T-Shirt',
                        cp: c.totalUnitCost || 0,
                        sp: c.retailPrice || 0,
                    }
                };
                sessionStorage.setItem('gos_calc_v2_draft', JSON.stringify(draft));
                window.closeSheet(sheetId);
                setTimeout(() => {
                    container.remove();
                    window.location.href = 'calculator.html';
                }, 400);
            };
            
            requestAnimationFrame(() => {
                window.openSheet(sheetId);
            });
            
        } else {
            window.showToast?.('Costing not found', 'error');
        }
    } catch(err) {
        console.error(err);
        window.showToast?.('Error loading costing details', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadCostings();
});
