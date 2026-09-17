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
            unit: 'in', // 'in' or 'cm'
            mode: 'advanced', // Distinguishes from quick costing

            // Dynamic Size Array (inch dimensions default)
            sizes: [
                { id: 'sz_1', name: '34 (XS)', qty: 0, bodyL: 23.75, chest: 18.00, slvL: 7.75, slvDia: 6.25, weightGms: 0, totalKg: 0 },
                { id: 'sz_2', name: '36 (S)',  qty: 0, bodyL: 25.00, chest: 18.75, slvL: 8.00, slvDia: 6.50, weightGms: 0, totalKg: 0 },
                { id: 'sz_3', name: '38 (M)',  qty: 0, bodyL: 26.25, chest: 19.50, slvL: 8.25, slvDia: 6.75, weightGms: 0, totalKg: 0 },
                { id: 'sz_4', name: '40 (L)',  qty: 0, bodyL: 27.50, chest: 20.25, slvL: 8.50, slvDia: 7.00, weightGms: 0, totalKg: 0 },
                { id: 'sz_5', name: '42 (XL)', qty: 0, bodyL: 28.75, chest: 21.00, slvL: 8.75, slvDia: 7.25, weightGms: 0, totalKg: 0 },
                { id: 'sz_6', name: '44 (2XL)',qty: 0, bodyL: 30.00, chest: 21.75, slvL: 9.00, slvDia: 7.50, weightGms: 0, totalKg: 0 }
            ],
            totalQty: 0,

            // Global Seam & Hem Margin Allowances (+in)
            bodyLM: 2.5,
            chestM: 1.5,
            slvLM: 1.5,
            slvDiaM: 1.5,

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
