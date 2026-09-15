// js/dashboard/components.js — Modular Components Generator for Modernized Dashboard

/**
 * Operational Health & State Machine Matrix
 */
export function renderHealthMatrix(matrix = {}) {
    const stages = [
        { key: 'Draft', label: 'Draft', icon: 'edit_note', color: 'text-secondary dark:text-slate-400', bg: 'bg-surface-variant dark:bg-slate-800' },
        { key: 'Quotation Sent', label: 'Quote Sent', icon: 'send', color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/10' },
        { key: 'Approved', label: 'Approved', icon: 'thumb_up', color: 'text-[#00B386]', bg: 'bg-[#00B386]/10' },
        { key: 'Material Reserved', label: 'Material', icon: 'inventory', color: 'text-[#FF9F0A]', bg: 'bg-[#FF9F0A]/10' },
        { key: 'Knitting', label: 'Knitting', icon: 'texture', color: 'text-[#0071E3]', bg: 'bg-[#0071E3]/10' },
        { key: 'Cutting', label: 'Cutting', icon: 'content_cut', color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/10' },
        { key: 'Stitching', label: 'Stitching', icon: 'strikethrough_s', color: 'text-[#5E5CE6]', bg: 'bg-[#5E5CE6]/10' },
        { key: 'QC Audit', label: 'QC Audit', icon: 'verified', color: 'text-[#008A00]', bg: 'bg-[#008A00]/10' },
        { key: 'Dispatched', label: 'Dispatched', icon: 'local_shipping', color: 'text-[#0071E3]', bg: 'bg-[#0071E3]/10' },
    ];

    return `
    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-[20px]">account_tree</span>
                </div>
                <div>
                    <h3 class="font-bold text-[16px] text-on-surface dark:text-slate-100">Order Lifecycle Health Matrix</h3>
                    <p class="text-[12px] text-secondary dark:text-slate-400">Real-time state machine pipeline & WIP tracking</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#00B386]/10 text-[#00B386]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#00B386] animate-pulse"></span>
                    Telemetry Live
                </span>
            </div>
        </div>

        <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            ${stages.map(s => {
                const count = matrix[s.key] || 0;
                const isHeavy = count >= 5;
                return `
                <div class="flex flex-col items-center p-3 rounded-2xl border border-outline-variant/40 dark:border-slate-800 bg-surface-container-low/40 dark:bg-slate-800/40 hover:bg-surface-variant/40 dark:hover:bg-slate-800 transition-all text-center group">
                    <div class="w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-2 transition-transform group-hover:scale-110">
                        <span class="material-symbols-outlined text-[20px]">${s.icon}</span>
                    </div>
                    <div class="text-[11px] font-medium text-secondary dark:text-slate-400 truncate w-full mb-0.5">${s.label}</div>
                    <div class="text-[18px] font-extrabold font-mono text-on-surface dark:text-slate-100">${count}</div>
                    ${isHeavy ? `<span class="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning/10 text-warning">Bottleneck</span>` : ''}
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

/**
 * Intelligent Anomaly Detection Micro-Widget
 */
export function renderAnomalyWidget(anomalies = []) {
    if (!anomalies || anomalies.length === 0) {
        return `
        <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center gap-3">
            <div class="w-9 h-9 rounded-2xl bg-[#00B386]/10 text-[#00B386] flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
                <div class="text-[14px] font-bold text-on-surface dark:text-slate-100">No Operational Anomalies</div>
                <div class="text-[12px] text-secondary dark:text-slate-400">All production telemetry metrics are within nominal Z-score baselines (±1.5σ).</div>
            </div>
        </div>`;
    }

    return `
    <div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div class="flex items-center gap-2.5 mb-3">
            <div class="w-8 h-8 rounded-xl bg-error/10 text-error flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div>
                <h3 class="font-bold text-[16px] text-on-surface dark:text-slate-100">Intelligent Anomaly Detection</h3>
                <p class="text-[12px] text-secondary dark:text-slate-400">Statistically significant metric deviations detected</p>
            </div>
        </div>

        <div class="flex flex-col gap-2.5">
            ${anomalies.map(a => `
            <div class="flex items-start justify-between gap-3 p-3 rounded-2xl bg-error/5 border border-error/20 dark:border-red-800/40">
                <div class="flex items-start gap-2.5">
                    <span class="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
                    <div>
                        <div class="text-[13px] font-bold text-on-surface dark:text-slate-100">${a.metric}</div>
                        <div class="text-[12px] text-secondary dark:text-slate-400 mt-0.5">${a.message}</div>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <span class="text-[12px] font-bold font-mono text-error">${a.currentValue}</span>
                    <div class="text-[10px] font-semibold text-error uppercase tracking-wider mt-0.5">${a.severity}</div>
                </div>
            </div>
            `).join('')}
        </div>
    </div>`;
}
