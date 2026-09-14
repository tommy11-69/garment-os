/**
 * Garment OS — Production Workflow Engine & Domain Definitions
 *
 * Core Concept:
 * - Orders are commercial containers with one or more Product Items.
 * - Each Product Item has its own custom Workflow Route.
 * - Order progress is a weighted roll-up of its products' current stage in their respective workflows.
 */

export const STAGE_KEYS = {
    OVERVIEW: 'overview',
    PROCUREMENT: 'procurement',
    FABRIC: 'fabric',
    CUTTING: 'cutting',
    PRINT_WASH: 'print_wash',
    STITCHING: 'stitching',
    PACKING: 'packing',
    DISPATCH: 'dispatch'
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

    if (s.includes('procure') || s.includes('sourc') || s.includes('yarn')) return 'procurement';
    if (s.includes('fabric') || s.includes('knit') || s.includes('dye')) return 'fabric';
    if (s.includes('cut')) return 'cutting';
    if (s.includes('print') || s.includes('embroid') || s.includes('wash')) return 'print_wash';
    if (s.includes('stitch') || s.includes('sew')) return 'stitching';
    if (s.includes('iron') || s.includes('pack') || s.includes('finish')) return 'packing';
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
            activeStage: 'fabric',
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
            status: order.status || 'Fabric',
            workflowType: order.workflowType || 'default',
            sizes: order.stageData?.cutting?.sizes || {}
        }];

    const totalOrderQty = products.reduce((sum, p) => sum + (Number(p.qty) || 0), 0) || Number(order.qty) || 1;
    let weightedScoreSum = 0;
    let lowestStageIndex = 999;
    let bottleneckStageKey = 'fabric';

    const productsSummary = products.map((prod, index) => {
        const prodQty = Number(prod.qty) || 0;
        const stages = getProductWorkflowStages(prod, order.workflowType);
        const currentStageKey = normalizeStageKey(prod.status || order.status);
        
        let stageIdx = stages.indexOf(currentStageKey);
        if (stageIdx === -1) {
            stageIdx = 0;
        }

        // Percentage for this product in its workflow (0% to 100%)
        const prodPct = stages.length > 1
            ? Math.min(100, Math.round((stageIdx / (stages.length - 1)) * 100))
            : (currentStageKey === 'dispatch' ? 100 : 50);

        // Track global lowest operational phase
        if (stageIdx < lowestStageIndex) {
            lowestStageIndex = stageIdx;
            bottleneckStageKey = stages[stageIdx];
        }

        weightedScoreSum += (prodQty * prodPct);

        return {
            index,
            name: prod.name || `Item #${index + 1}`,
            qty: prodQty,
            currentStageKey,
            stageLabel: STAGE_DEFINITIONS[currentStageKey]?.label || currentStageKey,
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
        activeStageDef: STAGE_DEFINITIONS[bottleneckStageKey] || STAGE_DEFINITIONS.fabric,
        isBottleneck,
        totalOrderQty,
        productsSummary
    };
}
