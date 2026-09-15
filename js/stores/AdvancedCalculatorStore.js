// js/stores/AdvancedCalculatorStore.js

class AdvancedCalculatorStore {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
    }

    getInitialState() {
        return {
            clientName: '',
            garmentType: 'Garment',
            currency: '₹',
            mode: 'advanced',
            // Size & Quantity
            sizes: [
                { id: 's1', name: 'S', ratio: 1, qty: 100 },
                { id: 's2', name: 'M', ratio: 2, qty: 200 },
                { id: 's3', name: 'L', ratio: 2, qty: 200 },
                { id: 's4', name: 'XL', ratio: 1, qty: 100 }
            ],
            totalQty: 600,
            
            // Multi-Fabric Engine
            components: [
                {
                    id: 'c1',
                    name: 'Body',
                    fabricPriceKg: 500,
                    wastage: 5,
                    bodyL: 28, bodyLM: 6,
                    chest: 22, chestM: 4,
                    slvL: 9, slvLM: 4,
                    slvDia: 8, slvDiaM: 4,
                    gsm: 180,
                    weightGms: 0,
                    costPc: 0
                }
            ],
            
            // Trims & BOM Engine
            trims: [
                { id: 't1', name: 'Thread', unit: 'cone', cons: 0.1, rate: 120, costPc: 12 },
                { id: 't2', name: 'Polybag', unit: 'pc', cons: 1, rate: 3, costPc: 3 }
            ],
            
            // CMT & VAS
            cmt: 45,
            washing: 0,
            embroidery: 0,
            printing: 0,
            freight: 0,
            other: 0,
            
            // Margins
            totalCost: 0,
            cpPc: 0,
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
