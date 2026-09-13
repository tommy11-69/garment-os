import { BaseRepository } from './BaseRepository.js?v=5.2';
import { db } from '../data/database.js?v=5.2';

// Default garment industry categories with icons & color schemes
export const CATEGORY_META = {
    'Fabric': { icon: 'texture', iconColor: 'bg-[#0071E3]/10 text-[#0071E3]', defaultUnit: 'Kgs' },
    'Rib': { icon: 'line_weight', iconColor: 'bg-[#FF9500]/10 text-[#FF9500]', defaultUnit: 'Kgs' },
    'Yarn': { icon: 'workspaces', iconColor: 'bg-[#AF52DE]/10 text-[#AF52DE]', defaultUnit: 'Kgs' },
    'Stitching Cones': { icon: 'straighten', iconColor: 'bg-[#5856D6]/10 text-[#5856D6]', defaultUnit: 'Cones' },
    'Patterns': { icon: 'architecture', iconColor: 'bg-[#007AFF]/10 text-[#007AFF]', defaultUnit: 'Sets' },
    'Trims & Accessories': { icon: 'join_inner', iconColor: 'bg-[#34C759]/10 text-[#34C759]', defaultUnit: 'Pcs' },
    'Packaging': { icon: 'inventory_2', iconColor: 'bg-[#FF2D55]/10 text-[#FF2D55]', defaultUnit: 'Pcs' },
    'Finished Goods': { icon: 'checkroom', iconColor: 'bg-[#00C7BE]/10 text-[#00C7BE]', defaultUnit: 'Pcs' }
};

// Realistic seed data covering garment manufacturing cluster operations
const DEFAULT_GARMENT_INVENTORY = [
    {
        id: 'inv-101',
        name: '100% Combed Cotton Single Jersey 180 GSM',
        sku: 'FAB-CSJ-180-NVY',
        category: 'Fabric',
        subCategory: 'Single Jersey',
        quantity: 1250,
        unit: 'Kgs',
        costPrice: 280,
        totalValue: 350000,
        minStock: 200,
        location: 'Bay A-02',
        supplier: 'Raj Textiles & Mills',
        supplierId: 'v-101',
        color: 'Navy Blue (#1A2B4C)',
        specifications: { gsm: 180, width: '30" Tubular', blend: '100% Cotton Combed', rolls: 48 },
        notes: 'Pre-shrunk bio-washed knit fabric for crew neck orders.',
        movementHistory: [
            { id: 'mov-1', type: 'STOCK_IN', qty: 1500, date: '2026-08-10T10:00:00.000Z', ref: 'PO-2026-041', supplier: 'Raj Textiles & Mills', notes: '48 rolls received' },
            { id: 'mov-2', type: 'STOCK_OUT', qty: 250, date: '2026-08-18T14:30:00.000Z', ref: 'ORD-992', purpose: 'Cutting Section issue', notes: 'Order ORD-992 1,200 pcs' }
        ]
    },
    {
        id: 'inv-102',
        name: 'Poly-Cotton Fleece 280 GSM',
        sku: 'FAB-PCF-280-CHM',
        category: 'Fabric',
        subCategory: 'Fleece',
        quantity: 680,
        unit: 'Kgs',
        costPrice: 320,
        totalValue: 217600,
        minStock: 150,
        location: 'Bay A-05',
        supplier: 'Supreme Knitting Mills',
        supplierId: 'v-102',
        color: 'Charcoal Melange',
        specifications: { gsm: 280, width: '60" Open Width', blend: '60/40 Cotton Poly', rolls: 24 },
        notes: 'Brushed back fleece for winter hoodie styles.',
        movementHistory: [
            { id: 'mov-3', type: 'STOCK_IN', qty: 680, date: '2026-08-14T11:00:00.000Z', ref: 'PO-2026-055', supplier: 'Supreme Knitting Mills', notes: 'Initial delivery' }
        ]
    },
    {
        id: 'inv-103',
        name: 'Cotton Pique Polo Honeycomb 220 GSM',
        sku: 'FAB-PIQ-220-WHT',
        category: 'Fabric',
        subCategory: 'Pique Polo',
        quantity: 45,
        unit: 'Kgs',
        costPrice: 310,
        totalValue: 13950,
        minStock: 120,
        location: 'Bay B-01',
        supplier: 'Raj Textiles & Mills',
        supplierId: 'v-101',
        color: 'Optical White',
        specifications: { gsm: 220, width: '32" Tubular', blend: '100% Cotton', rolls: 2 },
        notes: 'Reorder required immediately for upcoming polo contract.',
        movementHistory: [
            { id: 'mov-4', type: 'STOCK_OUT', qty: 180, date: '2026-08-20T09:15:00.000Z', ref: 'ORD-104', purpose: 'Production issue', notes: 'Polo batch 1' }
        ]
    },
    {
        id: 'inv-104',
        name: '1x1 Cotton Lycra Neck Rib',
        sku: 'RIB-1X1-LYC-NVY',
        category: 'Rib',
        subCategory: '1x1 Rib',
        quantity: 95,
        unit: 'Kgs',
        costPrice: 340,
        totalValue: 32300,
        minStock: 30,
        location: 'Rib Rack R-01',
        supplier: 'Tirupur Ribs & Collars',
        supplierId: 'v-103',
        color: 'Navy Blue (Matched with FAB-CSJ-180-NVY)',
        specifications: { gsm: 240, width: '36" Open Width', elastane: '5% Spandex' },
        notes: 'Matching rib for 180 GSM Navy Jersey tee neckline.',
        movementHistory: [
            { id: 'mov-5', type: 'STOCK_IN', qty: 120, date: '2026-08-11T12:00:00.000Z', ref: 'PO-2026-042', supplier: 'Tirupur Ribs & Collars' }
        ]
    },
    {
        id: 'inv-105',
        name: '2x2 Flat Knit Jacquard Tipped Collar',
        sku: 'RIB-COL-TIP-BLK',
        category: 'Rib',
        subCategory: 'Collars & Cuffs',
        quantity: 450,
        unit: 'Pcs',
        costPrice: 28,
        totalValue: 12600,
        minStock: 100,
        location: 'Rib Rack R-03',
        supplier: 'Tirupur Ribs & Collars',
        supplierId: 'v-103',
        color: 'Black with Red Edge Tip',
        specifications: { size: '42cm x 8cm', tipping: 'Dual 2mm stripe' },
        notes: 'Pre-cut knitted collars for corporate polo batch.',
        movementHistory: []
    },
    {
        id: 'inv-106',
        name: '30s Combed Cotton Compact Knitting Yarn',
        sku: 'YRN-30S-COM-RAW',
        category: 'Yarn',
        subCategory: 'Combed Cotton',
        quantity: 2400,
        unit: 'Kgs',
        costPrice: 260,
        totalValue: 624000,
        minStock: 500,
        location: 'Yarn Godown Y-1',
        supplier: 'Lakshmi Cotton Mills',
        supplierId: 'v-104',
        color: 'Raw Ecru (Unbleached)',
        specifications: { count: '30s Ne', csp: 2950, bags: 48, conesPerBag: 24 },
        notes: 'Allocated for circular knitting machines 24-gauge.',
        movementHistory: [
            { id: 'mov-6', type: 'STOCK_IN', qty: 3000, date: '2026-08-01T08:00:00.000Z', ref: 'PO-2026-029', supplier: 'Lakshmi Cotton Mills' }
        ]
    },
    {
        id: 'inv-107',
        name: '40/2 Spun Polyester Sewing Thread (Coats Epic)',
        sku: 'THR-402-COA-BLK',
        category: 'Stitching Cones',
        subCategory: 'Sewing Thread',
        quantity: 48,
        unit: 'Cones',
        costPrice: 95,
        totalValue: 4560,
        minStock: 15,
        location: 'Thread Shelf T-01',
        supplier: 'Coats India Threads',
        supplierId: 'v-105',
        color: 'Jet Black (#000)',
        specifications: { length: '5000 Meters/Cone', ply: '40/2', brand: 'Coats Epic' },
        notes: 'Main sewing thread for single needle lockstitch operations.',
        movementHistory: []
    },
    {
        id: 'inv-108',
        name: '100% Textured Overlock Thread',
        sku: 'THR-DTY-OVK-NVY',
        category: 'Stitching Cones',
        subCategory: 'Overlock Thread',
        quantity: 4,
        unit: 'Cones',
        costPrice: 120,
        totalValue: 480,
        minStock: 12,
        location: 'Thread Shelf T-02',
        supplier: 'Coats India Threads',
        supplierId: 'v-105',
        color: 'Navy Blue (#12)',
        specifications: { length: '10000 Meters/Cone', filament: '100% Texturised Poly' },
        notes: 'Critical low stock alert. Needed for 4-thread overlock line.',
        movementHistory: []
    },
    {
        id: 'inv-109',
        name: 'Oversized Streetwear Tee Master Pattern Set (XS-XXL)',
        sku: 'PAT-TEE-OVR-01',
        category: 'Patterns',
        subCategory: 'Patterns',
        quantity: 1,
        unit: 'Sets',
        costPrice: 4500,
        totalValue: 4500,
        minStock: 1,
        location: 'Pattern Room P-01',
        supplier: 'In-House Pattern Lab',
        supplierId: 'v-internal',
        color: 'Kraft Board',
        specifications: { sizes: 'XS, S, M, L, XL, XXL', allowance: '1.2cm seam allowance included' },
        notes: 'Standard drop-shoulder 240 GSM pattern set with tech pack grading.',
        movementHistory: []
    },
    {
        id: 'inv-110',
        name: 'CAD Plotter Marker Paper Roll 64"',
        sku: 'PAT-CAD-PPR-64',
        category: 'Patterns',
        subCategory: 'Marker Paper',
        quantity: 6,
        unit: 'Rolls',
        costPrice: 1200,
        totalValue: 7200,
        minStock: 2,
        location: 'Cutting Section C-01',
        supplier: 'Apex CAD Systems',
        supplierId: 'v-106',
        color: 'White Grid',
        specifications: { width: '64 Inches', length: '100 Meters/Roll', gsm: 55 },
        notes: 'For Gerber plotter marker generation before fabric laying.',
        movementHistory: []
    },
    {
        id: 'inv-111',
        name: 'YKK Antique Brass Metal Zippers 6"',
        sku: 'TRM-ZIP-BRS-06',
        category: 'Trims & Accessories',
        subCategory: 'Zippers',
        quantity: 1200,
        unit: 'Pcs',
        costPrice: 14,
        totalValue: 16800,
        minStock: 300,
        location: 'Trims Rack TR-04',
        supplier: 'YKK India Fastening',
        supplierId: 'v-107',
        color: 'Antique Brass Teeth / Black Tape',
        specifications: { size: '6 Inch (15cm)', teeth: '#4 Metal', slider: 'Auto-lock' },
        notes: 'Pouch & pocket closure zippers for utility overshirts.',
        movementHistory: []
    },
    {
        id: 'inv-112',
        name: 'Self-Adhesive BOPP T-Shirt Polybags (10x14")',
        sku: 'PKG-BOPP-1014',
        category: 'Packaging',
        subCategory: 'Polybags',
        quantity: 8500,
        unit: 'Pcs',
        costPrice: 1.2,
        totalValue: 10200,
        minStock: 2000,
        location: 'Pack Warehouse PK-02',
        supplier: 'PolyPrint Packaging',
        supplierId: 'v-108',
        color: 'Crystal Clear',
        specifications: { dimensions: '10" x 14" + 2" Flap', thickness: '40 Microns', warning: 'Suffocation warning printed' },
        notes: 'Single garment packaging with resealable peel strip.',
        movementHistory: []
    },
    {
        id: 'inv-113',
        name: '7-Ply Corrugated Export Shipping Cartons',
        sku: 'PKG-CTN-7P-2418',
        category: 'Packaging',
        subCategory: 'Cartons & Boxes',
        quantity: 180,
        unit: 'Boxes',
        costPrice: 65,
        totalValue: 11700,
        minStock: 50,
        location: 'Pack Warehouse PK-05',
        supplier: 'Apex Corrugators',
        supplierId: 'v-109',
        color: 'Brown Kraft',
        specifications: { dimensions: '24" x 18" x 18"', strength: '180 GSM Craft 7-Ply', capacity: '75 T-Shirts' },
        notes: 'Standard export shipping master cartons.',
        movementHistory: []
    },
    {
        id: 'inv-114',
        name: 'Heavyweight Blank Tee 240 GSM (Black - M)',
        sku: 'FG-TEE-HVY-BLK-M',
        category: 'Finished Goods',
        subCategory: 'T-Shirts',
        quantity: 320,
        unit: 'Pcs',
        costPrice: 210,
        totalValue: 67200,
        minStock: 50,
        location: 'FG Shelf FG-12',
        supplier: 'Factory In-House Production',
        supplierId: 'v-internal',
        color: 'Pitch Black',
        specifications: { size: 'Medium (M)', gsm: 240, style: 'Drop Shoulder Oversized' },
        notes: 'Ready blank stock for urgent screen printing & DTC fulfillment.',
        movementHistory: []
    }
];

class InventoryRepository extends BaseRepository {
    constructor() {
        super('inventory');
        this.categoryMeta = CATEGORY_META;
    }

    /**
     * Normalizes an inventory item with live status, color tokens, and calculated totals
     */
    normalizeItem(item) {
        if (!item) return null;
        
        const category = item.category || 'Fabric';
        const meta = CATEGORY_META[category] || CATEGORY_META['Fabric'];
        
        const qty = Number(item.quantity || 0);
        const costPrice = Number(item.costPrice != null ? item.costPrice : (item.unitCost != null ? item.unitCost : (item.unitPrice || 0)));
        const minStock = Number(item.minStock || 50);
        const totalValue = Number(item.totalValue != null ? item.totalValue : (qty * costPrice));
        
        let status = item.status || 'In Stock';
        let statusColor = 'bg-[#008A00]/10 text-[#008A00]';
        
        if (qty <= 0) {
            status = 'Out of Stock';
            statusColor = 'bg-error/10 text-error';
        } else if (qty <= minStock) {
            status = 'Low Stock';
            statusColor = 'bg-[#FF9F0A]/10 text-[#FF9F0A]';
        } else {
            status = 'In Stock';
            statusColor = 'bg-[#008A00]/10 text-[#008A00]';
        }
        
        return {
            ...item,
            category,
            quantity: qty,
            costPrice,
            unitCost: costPrice,
            totalValue,
            minStock,
            unit: item.unit || meta.defaultUnit,
            status,
            statusColor,
            icon: item.icon || meta.icon,
            iconColor: item.iconColor || meta.iconColor,
            movementHistory: Array.isArray(item.movementHistory) ? item.movementHistory : []
        };
    }

    /**
     * Retrieves all items, bootstrapping with default seeds if DB is empty or bare
     */
    async getAllEnriched() {
        let items = await this.getAll();
        
        // If DB has 2 or fewer legacy items without categories, seed with rich garment inventory
        if (!items || items.length <= 2) {
            try {
                const hasRichData = items && items.some(i => i.category && i.category !== 'Fabric');
                if (!hasRichData) {
                    for (const seedItem of DEFAULT_GARMENT_INVENTORY) {
                        const existing = items ? items.find(i => i.sku === seedItem.sku || i.id === seedItem.id) : null;
                        if (!existing) {
                            await this.create(seedItem).catch(() => {});
                        }
                    }
                    items = await this.getAll();
                }
            } catch (e) {
                console.warn("Could not seed default inventory:", e);
            }
        }
        
        return (items || []).map(i => this.normalizeItem(i));
    }

    /**
     * Search and multi-filter inventory
     */
    async searchInventory(query = '', categoryFilter = 'All', statusFilter = 'All', sortBy = 'newest') {
        await db._delay(50);
        let collection = await this.getAllEnriched();

        // 1. Category Filter
        if (categoryFilter && categoryFilter !== 'All') {
            collection = collection.filter(i => i.category === categoryFilter);
        }

        // 2. Status Filter
        if (statusFilter && statusFilter !== 'All') {
            collection = collection.filter(i => i.status === statusFilter);
        }

        // 3. Search Query
        if (query) {
            const q = query.toLowerCase().trim();
            collection = collection.filter(i => 
                (i.name && i.name.toLowerCase().includes(q)) ||
                (i.sku && i.sku.toLowerCase().includes(q)) ||
                (i.category && i.category.toLowerCase().includes(q)) ||
                (i.subCategory && i.subCategory.toLowerCase().includes(q)) ||
                (i.location && i.location.toLowerCase().includes(q)) ||
                (i.color && i.color.toLowerCase().includes(q)) ||
                (i.supplier && i.supplier.toLowerCase().includes(q))
            );
        }

        // 4. Sorting
        collection.sort((a, b) => {
            switch (sortBy) {
                case 'highest-value':
                    return (b.totalValue || 0) - (a.totalValue || 0);
                case 'lowest-stock':
                    return (a.quantity || 0) - (b.quantity || 0);
                case 'highest-stock':
                    return (b.quantity || 0) - (a.quantity || 0);
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'newest':
                default:
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            }
        });

        return collection;
    }

    /**
     * Calculate summary KPIs across entire inventory
     */
    async getInventoryKPIs() {
        const items = await this.getAllEnriched();
        
        let totalValuation = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let inStockCount = 0;

        items.forEach(item => {
            totalValuation += (item.totalValue || 0);
            if (item.status === 'Out of Stock') {
                outOfStockCount++;
            } else if (item.status === 'Low Stock') {
                lowStockCount++;
            } else {
                inStockCount++;
            }
        });

        return {
            totalValuation,
            totalSKUs: items.length,
            lowStockCount,
            outOfStockCount,
            inStockCount
        };
    }

    /**
     * Records Stock In (Goods Receipt / Inward)
     */
    async recordStockIn(id, { qty, costPrice, supplier, supplierId, poNumber, location, notes }) {
        const raw = await this.getById(id);
        if (!raw) throw new Error('Inventory item not found');

        const prevQty = Number(raw.quantity || 0);
        const addQty = Number(qty || 0);
        const newQty = prevQty + addQty;
        const newCost = (costPrice && Number(costPrice) > 0) ? Number(costPrice) : (Number(raw.costPrice) || 0);
        const totalValue = newQty * newCost;

        const movement = {
            id: 'mov-' + Date.now(),
            type: 'STOCK_IN',
            qty: addQty,
            date: new Date().toISOString(),
            ref: poNumber || 'Manual Receipt',
            supplier: supplier || raw.supplier || '',
            notes: notes || '',
            prevQty,
            newQty
        };

        const movementHistory = Array.isArray(raw.movementHistory) ? [...raw.movementHistory, movement] : [movement];

        const updatePayload = {
            quantity: newQty,
            costPrice: newCost,
            totalValue,
            movementHistory
        };

        if (location) updatePayload.location = location;
        if (supplier) updatePayload.supplier = supplier;
        if (supplierId) updatePayload.supplierId = supplierId;

        const updated = await this.update(id, updatePayload);
        return this.normalizeItem(updated);
    }

    /**
     * Records Stock Out (Issue to Production / Cutting / Stitching / Sampling)
     */
    async recordStockOut(id, { qty, orderId, purpose, notes }) {
        const raw = await this.getById(id);
        if (!raw) throw new Error('Inventory item not found');

        const prevQty = Number(raw.quantity || 0);
        const deductQty = Number(qty || 0);
        const newQty = Math.max(0, prevQty - deductQty);
        const costPrice = Number(raw.costPrice || 0);
        const totalValue = newQty * costPrice;

        const movement = {
            id: 'mov-' + Date.now(),
            type: 'STOCK_OUT',
            qty: deductQty,
            date: new Date().toISOString(),
            ref: orderId || 'Production Issue',
            purpose: purpose || 'Cutting / Stitching',
            notes: notes || '',
            prevQty,
            newQty
        };

        const movementHistory = Array.isArray(raw.movementHistory) ? [...raw.movementHistory, movement] : [movement];

        const updatePayload = {
            quantity: newQty,
            totalValue,
            movementHistory
        };

        const updated = await this.update(id, updatePayload);
        return this.normalizeItem(updated);
    }

    /**
     * Records Stock Adjustment (Physical Audit / Wastage / Damage Write-off)
     */
    async adjustStock(id, { newQty, reasonCode, notes }) {
        const raw = await this.getById(id);
        if (!raw) throw new Error('Inventory item not found');

        const prevQty = Number(raw.quantity || 0);
        const finalQty = Math.max(0, Number(newQty || 0));
        const variance = finalQty - prevQty;
        const costPrice = Number(raw.costPrice || 0);
        const totalValue = finalQty * costPrice;

        const movement = {
            id: 'mov-' + Date.now(),
            type: 'ADJUSTMENT',
            variance,
            date: new Date().toISOString(),
            reason: reasonCode || 'Audit Discrepancy',
            notes: notes || '',
            prevQty,
            newQty: finalQty
        };

        const movementHistory = Array.isArray(raw.movementHistory) ? [...raw.movementHistory, movement] : [movement];

        const updatePayload = {
            quantity: finalQty,
            totalValue,
            movementHistory
        };

        const updated = await this.update(id, updatePayload);
        return this.normalizeItem(updated);
    }
}

export const inventoryRepository = new InventoryRepository();
