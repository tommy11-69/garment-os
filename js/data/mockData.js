// Mock Data for Garment OS
// Centralized data to simulate a backend database

export const customers = [
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
    },
    {
        id: "c-003",
        name: "Sarah Jenkins",
        company: "Nike Custom",
        initials: "SJ",
        avatar: null, // Test fallback to initials
        email: "s.jenkins@nike.com",
        phone: "+1 (555) 012-3456",
        status: "Active",
        statusColor: "bg-[#008A00]/10 text-[#008A00]"
    }
];

export const orders = [
    {
        id: "ORD-992",
        customerName: "Everlane Corp.",
        value: 12400,
        status: "On Track",
        statusColor: "bg-[#008A00]/10 text-[#008A00]",
        dateMonth: "Oct",
        dateDay: "24",
        progressPercentage: 65,
        progressLabel: "Cutting Phase",
        progressColor: "bg-primary"
    },
    {
        id: "ORD-995",
        customerName: "Patagonia",
        value: 8950,
        status: "Delayed",
        statusColor: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
        dateMonth: "Oct",
        dateDay: "26",
        progressPercentage: 15,
        progressLabel: "Material Sourcing",
        progressColor: "bg-[#FF9F0A]"
    }
];

export const inventory = [
    {
        id: "inv-001",
        name: "Organic Cotton Jersey",
        sku: "FAB-OC-001",
        quantity: "4,500",
        unit: "Meters",
        status: "In Stock",
        statusColor: "bg-[#008A00]/10 text-[#008A00]",
        icon: "inventory_2",
        iconColor: "bg-primary/10 text-primary"
    },
    {
        id: "inv-002",
        name: "Navy Blue Thread",
        sku: "THR-NB-024",
        quantity: "12",
        unit: "Cones",
        status: "Low Stock",
        statusColor: "bg-error/10 text-error",
        icon: "linear_scale",
        iconColor: "bg-[#5E5CE6]/10 text-[#5E5CE6]"
    }
];

export const activeBatches = [
    {
        id: "B-8092",
        description: "Organic Tees • 5k units",
        phase: "Cutting",
        progress: 45,
        progressColor: "bg-primary"
    },
    {
        id: "B-8093",
        description: "Denim Jackets • 1.2k units",
        phase: "Sewing",
        progress: 70,
        progressColor: "bg-[#FF9F0A]"
    }
];

export const transactions = [
    {
        id: "txn-001",
        type: "expense",
        title: "Fabric Supplier (TexCorp)",
        category: "Raw Materials",
        amount: 4200.00,
        amountColor: "text-on-surface", // negative visually but standard color in design
        isNegative: true,
        icon: "store",
        iconBg: "bg-error/10",
        iconColor: "text-error"
    },
    {
        id: "txn-002",
        type: "income",
        title: "Everlane Corp.",
        category: "Invoice #INV-2049",
        amount: 25000.00,
        amountColor: "text-[#008A00]",
        isNegative: false,
        icon: "account_balance_wallet",
        iconBg: "bg-[#008A00]/10",
        iconColor: "text-[#008A00]"
    },
    {
        id: "txn-003",
        type: "expense",
        title: "Electricity Board",
        category: "Utilities",
        amount: 850.50,
        amountColor: "text-on-surface",
        isNegative: true,
        icon: "electric_bolt",
        iconBg: "bg-error/10",
        iconColor: "text-error"
    }
];
