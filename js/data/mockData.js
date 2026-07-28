// Mock Data for Garment OS
// Centralized data to simulate a backend database

export const ORDER_STATUSES = {
    DRAFT: 'Draft',
    QUOTATION_SENT: 'Quotation Sent',
    AWAITING_APPROVAL: 'Awaiting Approval',
    APPROVED: 'Approved',
    MATERIAL_RESERVED: 'Material Reserved',
    PRODUCTION_ASSIGNED: 'Production Assigned',
    KNITTING: 'Knitting',
    DYEING: 'Dyeing',
    COMPACTING: 'Compacting',
    CUTTING: 'Cutting',
    PRINTING: 'Printing',
    EMBROIDERY: 'Embroidery',
    STITCHING: 'Stitching',
    QC: 'Quality Check',
    PACKING: 'Packing',
    READY_FOR_DISPATCH: 'Dispatch Ready',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived'
};
export let customers = [
    {
        id: "c-001",
        name: "Eleanor Vance",
        company: "Everlane Corp.",
        initials: "EV",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDjsQrnDGH6EpdDe4Jzpub5fpI9paxS1qSAF-0EYDdMRn-40Zfp1H4ivFc2T7cTj7HS3uZnWtjlCmyhcGKN0KHS3HNaNzMWa9yB-DqA66rQK9arPwIXmP6fDsjao2TRWu0oBpTuJXOMi1KOYpAZUIu7lItqa1jt8lggfNjZcOdLiLUjAY1Pzb1YSCbv0Mv1uuofmOTAuRcPT0in4vDp1x6znmYUJiKEFUrz6dxdh7LMj1KSq02cN5HiRB1n2brh4gxTAT1U9qJlUa8Q",
        email: "eleanor@everlane.com",
        phone: "+1 (555) 019-2834",
        status: "Active",
        statusColor: "bg-[#008A00]/10 text-[#008A00]"
    },
    {
        id: "c-002",
        name: "Marcus Thorne",
        company: "Patagonia",
        initials: "MT",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnM486kZM-lpNWk2IlqpzF64WxPwyZNAGRmmwbnl1hZ-4jogabI--2ibQdvzPZRfGgcdsRhOwmJc4blIdV_dfrApDpiQ-m6C8uPLmMUb6vUjeCvEyruI55DlXQUPPUz4Wbk722E-G5pUrRRZHOpe912RqyxaxQseAPz4miWYpvNJHYJShsMaEi7ViP2m5_Hc5EXSnMakPPbSQ45nQQTAYQ5l5gwT6clchpVQxqZCiAOfsBJ5hzqwoaHDLdD-YRAA1JFY8S7YOnN_ON",
        email: "m.thorne@patagonia.com",
        phone: "+1 (555) 018-9273",
        status: "Inactive",
        statusColor: "bg-surface-variant text-secondary"
    }
];

export let costings = [
    {
        id: "cost-001",
        styleRef: "SS24-TS-01",
        clientId: "c-001",
        totalUnitCost: 22.10,
        retailPrice: 34.50,
        status: "Draft", // Draft, Quoted, Accepted
        date: "2026-07-15",
        materials: [
            { invId: "inv-001", estimatedConsumption: 1.2 }
        ]
    }
];

export let orders = [
    {
        id: "ORD-992",
        customerName: "Everlane Corp.",
        customerId: "c-001",
        costingId: "cost-001",
        product: "Organic Cotton Tees (SS24)",
        sizes: ["S", "M", "L", "XL"],
        colours: ["Navy", "White", "Heather Grey"],
        qty: 5000,
        
        // Financials (Master Spec)
        unitPrice: 34.50,
        subtotal: 172500,
        discount: 0,
        tax: 8625, // 5% example
        shipping: 500,
        grandTotal: 181625,
        value: 181625, // For legacy backward compatibility
        incurredCost: 4500,
        quotedCost: 110500,
        
        status: ORDER_STATUSES.CUTTING,
        statusColor: "bg-orange-500/10 text-orange-600",
        dateMonth: "Oct",
        dateDay: "24",
        deliveryDate: "2026-10-24",
        priority: "High",
        
        // Production Tracking
        factory: "Unit A - South Wing",
        productionManager: "Sarah Jenkins",
        merchandiser: "Tom Hardy",
        progressPercentage: 45,
        progressLabel: "Cutting Patterns",
        progressColor: "bg-orange-500",
        
        notes: "Strict QC needed on Navy colorway.",
        
        // Timeline & Tasks
        timeline: [
            { date: "Oct 20, 2026 - 09:00 AM", title: "Order Created", user: "Eleanor Vance", type: "system", status: "completed" },
            { date: "Oct 21, 2026 - 10:15 AM", title: "Status Updated: Approved", user: "System", type: "status", status: "completed" },
            { date: "Oct 22, 2026 - 11:30 AM", title: "Status Updated: Material Reserved", user: "Inventory", type: "inventory", status: "completed" },
            { date: "Oct 24, 2026 - 08:00 AM", title: "Status Updated: Cutting", user: "Sarah Jenkins", type: "status", status: "active" }
        ],
        tasks: [
            { id: "t1", title: "Source 500kg Organic Cotton Yarn", assignee: "Purchasing", status: "Completed" },
            { id: "t2", title: "Cut patterns for sizes S, M, L", assignee: "Cutting Floor", status: "Pending" },
            { id: "t3", title: "QC on first 100 cut pieces", assignee: "QC Team", status: "Pending" }
        ],
        expenses: [
            { id: "e1", type: "Material", amount: 4000, date: "2026-10-22", notes: "Cotton Yarn Purchase" },
            { id: "e2", type: "Overhead", amount: 500, date: "2026-10-23", notes: "Cutting Setup" }
        ]
    }
];

export let inventory = [
    {
        id: "inv-001",
        name: "Organic Cotton Jersey",
        sku: "FAB-OC-001",
        quantity: 4500, // Numeric for easier math
        unit: "Meters",
        status: "In Stock",
        statusColor: "bg-[#008A00]/10 text-[#008A00]",
        icon: "inventory_2",
        iconColor: "bg-primary/10 text-primary",
        historicalAvgConsumption: 1.25
    },
    {
        id: "inv-002",
        name: "Navy Blue Thread",
        sku: "THR-NB-024",
        quantity: 12,
        unit: "Cones",
        status: "Low Stock",
        statusColor: "bg-error/10 text-error",
        icon: "linear_scale",
        iconColor: "bg-[#5E5CE6]/10 text-[#5E5CE6]",
        historicalAvgConsumption: 0.05
    }
];

export let activeBatches = [
    {
        id: "B-8092",
        orderId: "ORD-992",
        description: "Organic Tees • 5k units",
        phase: "Cutting",
        progress: 45,
        progressColor: "bg-primary",
        expenses: ["txn-004"], // Array of transaction IDs
        consumptions: [
            { invId: "inv-001", actualConsumption: 150, date: "2026-10-15" }
        ]
    }
];

export let transactions = [
    {
        id: "txn-001",
        type: "expense",
        title: "Fabric Supplier (TexCorp)",
        category: "Raw Materials",
        amount: 4200.00,
        amountColor: "text-on-surface",
        isNegative: true,
        icon: "store",
        iconBg: "bg-error/10",
        iconColor: "text-error"
    },
    {
        id: "txn-004",
        type: "expense",
        title: "Dyeing Chemicals",
        category: "Production",
        amount: 500.00,
        amountColor: "text-on-surface",
        isNegative: true,
        icon: "science",
        iconBg: "bg-error/10",
        iconColor: "text-error",
        linkedBatchId: "B-8092"
    }
];

// Utility to export mutable data
export const setInventory = (newInv) => { inventory = newInv; };
export const setTransactions = (newTxns) => { transactions = newTxns; };
export const setActiveBatches = (newBatches) => { activeBatches = newBatches; };
export const setCostings = (newCostings) => { costings = newCostings; };
export const setOrders = (newOrders) => { orders = newOrders; };
