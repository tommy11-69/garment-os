// js/stores/AdvancedCalculatorStore.js

class AdvancedCalculatorStore {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
    }

    getInitialState() {
        return {
            clientName: '',
            garmentType: 'T-Shirt',
            currency: '₹',
            mode: 'advanced', // Distinguishes from unified
            
            // Size & Quantity
            sizes: [
                { id: 's1', name: 'S', qty: 100, bodyL: 28, chest: 20, slvL: 8, slvDia: 7, weightGms: 0 },
                { id: 's2', name: 'M', qty: 200, bodyL: 29, chest: 21, slvL: 8.5, slvDia: 7.5, weightGms: 0 },
                { id: 's3', name: 'L', qty: 200, bodyL: 30, chest: 22, slvL: 9, slvDia: 8, weightGms: 0 },
                { id: 's4', name: 'XL', qty: 100, bodyL: 31, chest: 23, slvL: 9.5, slvDia: 8.5, weightGms: 0 }
            ],
            totalQty: 600,
            
            // Pattern Margins & Fabric Base
            bodyLM: 6,
            chestM: 4,
            slvLM: 4,
            slvDiaM: 4,
            gsm: 180,
            
            // Fabric Cost
            fabricPriceKg: 0,
            wastage: 5,
            
            // Computed Fabric
            totalFabricKgs: 0,
            avgWeightGms: 0,
            pcsPerKg: 0, // Auto-derived avg
            fabricCostPc: 0,

            // CMT (Combined vs Separate)
            cmtMode: 'combined', // 'combined' or 'separate'
            cmt: 0,
            cutting: 0,
            fusing: 0,
            wages: 0,
            packing: 0,

            // Printing & Sublimation
            printing: 0,
            sublimation: 0,
            
            // Allowances & Overheads
            allowances: 0,
            overheads: 0,
            
            // Accessories & Pattern (Lump sums per order)
            acc1: 0,
            acc2: 0,
            acc3: 0,
            pattern: 0,
            
            // Margins
            cpPc: 0,
            totalCost: 0,
            profitPct: 30,
            spPc: 0,
            totalSales: 0,
            profitDone: 0
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

    reset() {
        this.state = this.getInitialState();
        this.notify();
    }
}

export const advancedCalculatorStore = new AdvancedCalculatorStore();
window.advancedCalculatorStore = advancedCalculatorStore;
