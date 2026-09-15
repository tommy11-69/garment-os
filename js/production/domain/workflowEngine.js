/**
 * Garment OS — Production Workflow Engine & Domain Definitions
 *
 * Core Concept:
 * - Orders are commercial containers with one or more Product Items.
 * - Each Product Item has its own custom Workflow Route.
 * - Order progress is a weighted roll-up of its products' current stage in their respective workflows.
 */

export const STAGE_KEYS = {
    OVERVIEW:    'overview',
    PROCUREMENT: 'procurement',
    WINDING:     'winding',
    KNITTING:    'knitting',
    DYEING:      'dyeing',
    FABRIC:      'fabric',
    CUTTING:     'cutting',
    PRINT_WASH:  'print_wash',
    STITCHING:   'stitching',
    PACKING:     'packing',
    DISPATCH:    'dispatch'
};

export const STAGE_DEFINITIONS = {
    overview: {
        id: 'overview',
        key: 'overview',
        label: 'Overview',
        shortLabel: 'Overview',
        icon: 'dashboard',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30',
        description: 'Factory floor live pulse, KPIs, workload queue and active order selector'
    },
    procurement: {
        id: 'procurement',
        key: 'procurement',
        label: 'Procurement & Sourcing',
        shortLabel: 'Sourcing',
        icon: 'shopping_cart',
        color: 'text-[#5856D6]',
        bgColor: 'bg-[#5856D6]/10',
        borderColor: 'border-[#5856D6]/30',
        weight: 10,
        description: 'Supplier POs, yarn inward, and trim accessories tracking'
    },
    fabric: {
        id: 'fabric',
        key: 'fabric',
        label: 'Fabric & Inward',
        shortLabel: 'Fabric',
        icon: 'texture',
        color: 'text-[#007AFF]',
        bgColor: 'bg-[#007AFF]/10',
        borderColor: 'border-[#007AFF]/30',
        weight: 20,
        description: 'Roll tally, actual weight (kg), GSM, Dia, shrinkage, and shade QC'
    },
    cutting: {
        id: 'cutting',
        key: 'cutting',
        label: 'Cutting & Bundles',
        shortLabel: 'Cutting',
        icon: 'content_cut',
        color: 'text-[#FF9500]',
        bgColor: 'bg-[#FF9500]/10',
        borderColor: 'border-[#FF9500]/30',
        weight: 35,
        description: 'Marker layout, planned vs cut sizes, bundle tickets, and scrap %'
    },
    print_wash: {
        id: 'print_wash',
        key: 'print_wash',
        label: 'Print, Embroidery & Wash',
        shortLabel: 'Print/Wash',
        icon: 'palette',
        color: 'text-[#AF52DE]',
        bgColor: 'bg-[#AF52DE]/10',
        borderColor: 'border-[#AF52DE]/30',
        weight: 50,
        description: 'Strike-off approvals, panel outward dispatch, inward receipt, and rejects'
    },
    stitching: {
        id: 'stitching',
        key: 'stitching',
        label: 'Stitching & Assembly',
        shortLabel: 'Stitching',
        icon: 'precision_manufacturing',
        color: 'text-[#34C759]',
        bgColor: 'bg-[#34C759]/10',
        borderColor: 'border-[#34C759]/30',
        weight: 75,
        description: 'Sewing line allocation, hourly output logging, and inline QC defects'
    },
    packing: {
        id: 'packing',
        key: 'packing',
        label: 'Finishing & Packing',
        shortLabel: 'Packing',
        icon: 'inventory_2',
        color: 'text-[#FF2D55]',
        bgColor: 'bg-[#FF2D55]/10',
        borderColor: 'border-[#FF2D55]/30',
        weight: 90,
        description: 'Trimming, steam ironing, size-wise master carton matrix, and box labels'
    },
    dispatch: {
        id: 'dispatch',
        key: 'dispatch',
        label: 'Dispatch & Gate Pass',
        shortLabel: 'Dispatch',
        icon: 'local_shipping',
        color: 'text-[#30B0C7]',
        bgColor: 'bg-[#30B0C7]/10',
        borderColor: 'border-[#30B0C7]/30',
        weight: 100,
        description: 'Delivery Challan (DC), Gate Pass, vehicle / LR tracking, and customer handoff'
    },

    // ── Full Vertical Integration stages (Yarn-to-Garment) ───────────────────

    winding: {
        id: 'winding',
        key: 'winding',
        label: 'Yarn Winding',
        shortLabel: 'Winding',
        icon: 'rotate_right',
        color: 'text-[#FF6B35]',
        bgColor: 'bg-[#FF6B35]/10',
        borderColor: 'border-[#FF6B35]/30',
        weight: 15,
        description: 'Yarn cone winding, tension setup, breakage logging, and machine allocation'
    },

    knitting: {
        id: 'knitting',
        key: 'knitting',
        label: 'Knitting',
        shortLabel: 'Knitting',
        icon: 'grid_on',
        color: 'text-[#0EA5E9]',
        bgColor: 'bg-[#0EA5E9]/10',
        borderColor: 'border-[#0EA5E9]/30',
        weight: 28,
        description: 'Circular knitting machine allocation, fabric kg output, actual GSM & Dia QC'
    },

    dyeing: {
        id: 'dyeing',
        key: 'dyeing',
        label: 'Dyeing & Compacting',
        shortLabel: 'Dyeing',
        icon: 'water_drop',
        color: 'text-[#8B5CF6]',
        bgColor: 'bg-[#8B5CF6]/10',
        borderColor: 'border-[#8B5CF6]/30',
        weight: 42,
        description: 'Dyeing lot, shade approval, compacting process, shrinkage test & colorfastness grading'
    }
};

/**
 * Standard Workflow Routing Presets per Product Type
 */
export const WORKFLOW_ROUTES = {
    // Default Route: Standard Knits / Cut-Make-Trim
    default: [
        'procurement',
        'fabric',
        'cutting',
        'stitching',
        'print_wash',
        'packing',
        'dispatch'
    ],
    // Print-First Route: Panels are screen-printed before sewing (e.g. Chest Print T-Shirts)
    print_before_stitch: [
        'procurement',
        'fabric',
        'cutting',
        'print_wash',
        'stitching',
        'packing',
        'dispatch'
    ],
    // Wash Route: Garments washed after stitching before final embellishment/packing
    wash_before_stitch: [
        'procurement',
        'fabric',
        'cutting',
        'print_wash',
        'stitching',
        'packing',
        'dispatch'
    ],
    // Stitch First, then Embroidery on Assembled Garment
    stitch_before_embroidery: [
        'procurement',
        'fabric',
        'cutting',
        'stitching',
        'print_wash',
        'packing',
        'dispatch'
    ],
    // Direct Fulfillment / Ready Goods Trading (Skips floor manufacturing)
    direct_fulfillment: [
        'procurement',
        'dispatch'
    ],

    // Full Vertical Integration — Yarn-to-Garment (factory knits its own fabric)
    full_vertical: [
        'procurement',   // Yarn & trims procurement
        'winding',       // Yarn winding onto cones / bobbins
        'knitting',      // Circular knitting to produce grey fabric
        'dyeing',        // Dyeing + compacting (shade approval & shrinkage test)
        'cutting',       // Fabric cutting (same as all standard routes)
        'stitching',     // Sewing assembly
        'print_wash',    // Print / embroidery / wash if any
        'packing',       // Finishing, ironing & packing
        'dispatch'       // Gate pass & dispatch
    ]
};

/**
 * Resolve the operational stage sequence for a given product
 */
export function getProductWorkflowStages(product, orderWorkflowType = 'default') {
    const wfKey = product?.workflowType || orderWorkflowType || 'default';
    return WORKFLOW_ROUTES[wfKey] || WORKFLOW_ROUTES.default;
}

/**
 * Map legacy or loose stage strings to canonical stage keys
 */
export function normalizeStageKey(rawStage) {
    if (!rawStage) return 'fabric';
    const s = String(rawStage).toLowerCase().trim();

    // Full-vertical specific stages — checked BEFORE generic 'fabric'/'knit' fallbacks
    if (s === 'winding' || s.includes('winding') || s.includes('cone') || s.includes('bobbin'))            return 'winding';
    if (s === 'knitting' || s.includes('knitting') || s.includes('circular knit'))                          return 'knitting';
    if (s === 'dyeing' || s.includes('dyeing') || s.includes('compacting') || s.includes('colour') || s.includes('color dye')) return 'dyeing';

    // Standard stage mappings
    if (s.includes('procure') || s.includes('sourc'))                         return 'procurement';
    if (s.includes('fabric') || s.includes('inward') || s.includes('grey'))   return 'fabric';
    if (s.includes('cut'))                                                     return 'cutting';
    if (s.includes('print') || s.includes('embroid') || s.includes('wash'))   return 'print_wash';
    if (s.includes('stitch') || s.includes('sew'))                            return 'stitching';
    if (s.includes('iron') || s.includes('pack') || s.includes('finish'))     return 'packing';
    if (s.includes('dispatch') || s.includes('deliver') || s.includes('ship')) return 'dispatch';

    return 'fabric';
}

/**
 * Calculate dynamic weighted progress for an order and its individual products
 * 
 * @param {Object} order The order entity
 * @returns {Object} { overallPercentage, activeStage, isBottleneck, productsSummary }
 */
export function calculateOrderRollup(order) {
    if (!order) {
        return {
            overallPercentage: 0,
            activeStage: 'procurement',
            status: 'Draft',
            isBottleneck: false,
            productsSummary: []
        };
    }

    // Standardize products list
    let products = Array.isArray(order.products) && order.products.length > 0
        ? order.products
        : [{
            name: order.product || 'Standard Garment',
            qty: Number(order.qty) || 0,
            category: 'Adults',
            status: order.status || 'Procurement',
            workflowType: order.workflowType || 'default',
            sizes: order.stageData?.cutting?.sizes || {}
        }];

    const totalOrderQty = products.reduce((sum, p) => sum + (Number(p.qty) || 0), 0) || Number(order.qty) || 1;
    let weightedScoreSum = 0;
    let lowestStageIndex = 999;
    let bottleneckStageKey = 'procurement';

    const productsSummary = products.map((prod, index) => {
        const prodQty = Number(prod.qty) || 0;
        const stages = getProductWorkflowStages(prod, order.workflowType);
        const initialStage = stages[0] || 'procurement';
        const rawStatus = prod.status || order.status || initialStage;
        const currentStageKey = normalizeStageKey(rawStatus);
        
        let stageIdx = stages.indexOf(currentStageKey);
        if (stageIdx === -1) {
            stageIdx = 0;
        }
        const activeStageKey = stages[stageIdx];

        // Percentage for this product in its workflow (0% to 100%)
        const prodPct = stages.length > 1
            ? Math.min(100, Math.round((stageIdx / (stages.length - 1)) * 100))
            : (activeStageKey === 'dispatch' ? 100 : 50);

        // Track global lowest operational phase
        if (stageIdx < lowestStageIndex) {
            lowestStageIndex = stageIdx;
            bottleneckStageKey = activeStageKey;
        }

        weightedScoreSum += (prodQty * prodPct);

        return {
            index,
            name: prod.name || `Item #${index + 1}`,
            qty: prodQty,
            currentStageKey: activeStageKey,
            stageLabel: STAGE_DEFINITIONS[activeStageKey]?.label || activeStageKey,
            percentage: prodPct,
            workflow: stages
        };
    });

    const overallPercentage = Math.min(100, Math.max(0, Math.round(weightedScoreSum / totalOrderQty)));

    // Check delivery deadline for bottleneck alerts
    let isBottleneck = false;
    if (order.deliveryDate) {
        const deadline = new Date(order.deliveryDate).getTime();
        const now = Date.now();
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 4 && overallPercentage < 70) {
            isBottleneck = true;
        }
    }

    return {
        overallPercentage,
        activeStageKey: bottleneckStageKey,
        activeStageDef: STAGE_DEFINITIONS[bottleneckStageKey] || STAGE_DEFINITIONS.procurement,
        isBottleneck,
        totalOrderQty,
        productsSummary
    };
}

/**
 * Merge per-product lineItems[] back into a flat stageData object for
 * backward compatibility with production workspace code that reads
 * order.stageData.fabric, order.stageData.cutting, etc.
 *
 * Numeric fields are summed; string/object fields are taken from the first
 * product that has them (primary product wins).
 *
 * @param {Array} lineItems  The lineItems[] array from the new order schema
 * @returns {Object}         Flat stageData compatible with legacy workspaces
 */
export function mergeLineItemsToFlatStageData(lineItems) {
    if (!Array.isArray(lineItems) || lineItems.length === 0) return {};

    const merged = {};

    lineItems.forEach(item => {
        if (!item || !item.stageData) return;

        Object.entries(item.stageData).forEach(([stageKey, stageVal]) => {
            if (!stageVal || typeof stageVal !== 'object') return;

            if (!merged[stageKey]) {
                // First product: deep-clone the stage block
                merged[stageKey] = { ...stageVal };

                // Preserve nested sizes as merged accumulator
                if (stageVal.sizes && typeof stageVal.sizes === 'object') {
                    merged[stageKey].sizes = { ...stageVal.sizes };
                }
            } else {
                // Subsequent products: merge numeric fields (sum), sizes grid (sum), ignore duplicates for strings
                Object.entries(stageVal).forEach(([k, v]) => {
                    if (k === 'sizes' && typeof v === 'object') {
                        // Merge size grids
                        if (!merged[stageKey].sizes) merged[stageKey].sizes = {};
                        Object.entries(v).forEach(([sz, qty]) => {
                            merged[stageKey].sizes[sz] = (merged[stageKey].sizes[sz] || 0) + (Number(qty) || 0);
                        });
                    } else if (typeof v === 'number' && typeof merged[stageKey][k] === 'number') {
                        merged[stageKey][k] += v;
                    } else if (merged[stageKey][k] === undefined || merged[stageKey][k] === null) {
                        merged[stageKey][k] = v;
                    }
                    // String fields from first product win — no override
                });
            }
        });
    });

    return merged;
}
