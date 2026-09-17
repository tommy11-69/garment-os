// js/stores/AdvancedCalculatorStore.js

class AdvancedCalculatorStore {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
    }

    getInitialState() {
        return {
            clientName: '',
            garmentName: '',
            garmentType: 'T-Shirt',
            currency: '₹',
            unit: 'cm', // 'cm' or 'in'
            mode: 'advanced', // Distinguishes from quick costing

            // Dynamic Size Array (cm dimensions)
            sizes: [
                { id: 'sz_1', name: 'S', qty: 0, bodyL: 0, chest: 0, slvL: 0, slvDia: 0, weightGms: 0, totalKg: 0 },
                { id: 'sz_2', name: 'M', qty: 0, bodyL: 0, chest: 0, slvL: 0, slvDia: 0, weightGms: 0, totalKg: 0 },
                { id: 'sz_3', name: 'L', qty: 0, bodyL: 0, chest: 0, slvL: 0, slvDia: 0, weightGms: 0, totalKg: 0 },
                { id: 'sz_4', name: 'XL', qty: 0, bodyL: 0, chest: 0, slvL: 0, slvDia: 0, weightGms: 0, totalKg: 0 }
            ],
            totalQty: 0,

            // Global Seam & Hem Margin Allowances (+cm)
            bodyLM: 6,
            chestM: 4,
            slvLM: 4,
            slvDiaM: 4,

            // Global Fabric Spec
            gsm: 0,
            fabricPriceKg: 0,
            wastage: 0,

            // Aggregated Computed Fabric Results
            totalFabricKg: 0,
            avgWeightGms: 0,
            pcsPerKg: 0,
            fabricCostPc: 0,
            totalFabricCost: 0,

            // Making / CMT Mode
            cmtMode: 'combined', // 'combined' or 'separate'
            cmt: 0,
            cmtTotal: 0,
            cutting: 0,
            cuttingTotal: 0,
            fusing: 0,
            fusingTotal: 0,
            wages: 0,
            wagesTotal: 0,
            packing: 0,
            packingTotal: 0,

            // Printing & Sublimation
            printing: 0,
            printingTotal: 0,
            sublimation: 0,
            sublimationTotal: 0,

            // Accessories & Pattern (Lump sums per order + Per Pc)
            acc1: 0,
            acc1Pc: 0,
            acc2: 0,
            acc2Pc: 0,
            acc3: 0,
            acc3Pc: 0,
            pattern: 0,

            // Allowances & Overheads
            allowances: 0,
            allowancesTotal: 0,
            overheads: 0,
            overheadsTotal: 0,

            // Cost & Selling Price Engine
            cpPc: 0,
            totalCost: 0,
            spPc: null,
            totalSales: 0,
            profitPct: 0,
            profitDone: 0,
            lastEdited: 'pct'
        };
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }

    update(updater) {
        if (typeof updater === 'function') {
            this.state = updater(this.state);
        } else {
            this.state = { ...this.state, ...updater };
        }
        this.notify();
    }

    addSize(name = 'New Size', defaults = {}, insertIndex = null) {
        const id = 'sz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const newSize = {
            id,
            name,
            qty: (defaults.qty !== undefined && defaults.qty !== null) ? defaults.qty : 0,
            bodyL: defaults.bodyL || 0,
            chest: defaults.chest || 0,
            slvL: defaults.slvL || 0,
            slvDia: defaults.slvDia || 0,
            weightGms: 0,
            totalKg: 0
        };
        this.update(s => ({
            ...s,
            sizes: insertIndex === null
                ? [...s.sizes, newSize]
                : [...s.sizes.slice(0, insertIndex), newSize, ...s.sizes.slice(insertIndex)]
        }));
    }

    removeSize(index) {
        if (this.state.sizes.length <= 1) return; // Keep at least one size
        this.update(s => {
            const sizes = [...s.sizes];
            sizes.splice(index, 1);
            return { ...s, sizes };
        });
    }

    reset() {
        this.state = this.getInitialState();
        this.notify();
    }
}

export const advancedCalculatorStore = new AdvancedCalculatorStore();
window.advancedCalculatorStore = advancedCalculatorStore;
