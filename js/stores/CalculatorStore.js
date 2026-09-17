import { BaseStore } from './BaseStore.js?v=5.2';
import { calculatorRepository } from '../repositories/CalculatorRepository.js?v=5.2';

class CalculatorStore extends BaseStore {
    constructor() {
        super(calculatorRepository);
        
        // Initial state for the calculator (same structure as original index.js)
        this.state = {
            ...this.state,
            currency: '₹',
            u: {
                qty: 0, pcsPerKg: 0, garmentName: '', garmentType: 'T-Shirt', cmtMode: 'combined',
                fabricPriceKg: 0, wastage: 0, fabricCostPc: 0,
                // Pattern Auto-Calc inputs
                bodyL: 0, bodyLM: 2.5, chest: 0, chestM: 1.5,
                slvL: 0, slvLM: 1.5, slvDia: 0, slvDiaM: 1.5,
                gsm: 0, weightGms: 0, patternCalcOpen: false,
                cmt: 0, cutting: 0, fusing: 0, wages: 0, packing: 0,
                printing: 0, sublimation: 0, allowances: 0, overheads: 0,
                acc1: 0, acc2: 0, acc3: 0, pattern: 0,
                cp: 0, totalCost: 0,
                sp: null, profitPct: null, totalSales: 0, profitDone: 0,
                lastEdited: null,
            },
            prefs: {
                stitchRate: 0,
                overheadsRate: 0,
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
    
    updateU(updates) {
        this.setState({ u: { ...this.state.u, ...updates } });
    }
    
    updatePrefs(updates) {
        this.setState({ prefs: { ...this.state.prefs, ...updates } });
        this.savePrefs();
    }
    
    resetCalculator() {
        this.setState({
            u: { 
                ...this.state.u, 
                qty:0, pcsPerKg:0, fabricPriceKg:0, wastage:0, fabricCostPc:0, 
                bodyL: 0, bodyLM: 2.5, chest: 0, chestM: 1.5,
                slvL: 0, slvLM: 1.5, slvDia: 0, slvDiaM: 1.5,
                gsm: 0, weightGms: 0, patternCalcOpen: false,
                cmt:0, cutting:0, fusing:0, wages:0, packing:0,
                printing:0, sublimation:0, allowances:0, overheads:0, 
                acc1:0, acc2:0, acc3:0, pattern:0,
                cp:0, totalCost:0, sp:null, profitPct:null, totalSales:0, profitDone:0, 
                lastEdited:null 
            }
        });
    }

    // --- Database Operations ---
    
    async saveCosting(data) {
        // Includes the current calculation snapshot
        const snapshot = {
            currency: this.state.currency,
            details: this.state.u,
            ...data
        };
        const newCosting = await this.create(snapshot);
        return newCosting;
    }
}

export const calculatorStore = new CalculatorStore();
