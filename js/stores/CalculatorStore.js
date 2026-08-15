import { BaseStore } from './BaseStore.js';
import { calculatorRepository } from '../repositories/CalculatorRepository.js';

class CalculatorStore extends BaseStore {
    constructor() {
        super(calculatorRepository);
        
        // Initial state for the calculator (same structure as original index.js)
        this.state = {
            ...this.state,
            currency: '₹',
            activeTab: 'pp',
            pp: {
                qty: 0, pcsPerKg: 0, fabricPriceKg: 0, wastage: 0,
                fabricCostPc: 0,
                printing: 0, wages: 0, packaging: 0, allowances: 0, overheads: 0,
                cp: 0, sp: null, profitPct: null,
                lastEdited: null,
                garmentType: 'T-Shirt',
            },
            oc: {
                qty: 0, fabric: 0,
                acc1: 0, acc2: 0, acc3: 0, pattern: 0,
                stitch: 0, sublimation: 0, overheads: 0, printing: 0,
                totalCost: 0, cp: 0,
                sp: null, profitPct: null, totalSales: 0, profitDone: 0,
                lastEdited: null,
                garmentType: 'T-Shirt',
            },
            prefs: {
                stitchRate: 25,
                overheadsRate: 2,
            }
        };
        
        this.loadPrefs();
    }

    loadPrefs() {
        try {
            const saved = localStorage.getItem('garment_os_calc_prefs');
            if (saved) {
                this.setState({ prefs: { ...this.state.prefs, ...JSON.parse(saved) } });
            }
        } catch (_) {}
    }

    savePrefs() {
        try {
            localStorage.setItem('garment_os_calc_prefs', JSON.stringify(this.state.prefs));
        } catch (_) {}
    }

    // --- Calculator State Updates ---
    
    setCurrency(sym) {
        this.setState({ currency: sym });
    }
    
    setActiveTab(tab) {
        this.setState({ activeTab: tab });
    }
    
    updatePP(updates) {
        this.setState({ pp: { ...this.state.pp, ...updates } });
    }
    
    updateOC(updates) {
        this.setState({ oc: { ...this.state.oc, ...updates } });
    }
    
    updatePrefs(updates) {
        this.setState({ prefs: { ...this.state.prefs, ...updates } });
        this.savePrefs();
    }
    
    resetCalculator() {
        this.setState({
            pp: { ...this.state.pp, qty:0, pcsPerKg:0, fabricPriceKg:0, wastage:0, fabricCostPc:0, printing:0, wages:0, packaging:0, allowances:0, overheads:0, cp:0, sp:null, profitPct:null, lastEdited:null },
            oc: { ...this.state.oc, qty:0, fabric:0, acc1:0, acc2:0, acc3:0, pattern:0, stitch:0, sublimation:0, overheads:0, printing:0, totalCost:0, cp:0, sp:null, profitPct:null, lastEdited:null }
        });
    }

    // --- Database Operations ---
    
    async saveCosting(data) {
        // Includes the current calculation snapshot
        const snapshot = {
            mode: this.state.activeTab,
            currency: this.state.currency,
            details: this.state.activeTab === 'order' ? this.state.oc : this.state.pp,
            ...data
        };
        const newCosting = await this.create(snapshot);
        return newCosting;
    }
}

export const calculatorStore = new CalculatorStore();
