-- Garment OS D1 Schema
-- All JSON array/object fields are stored as TEXT (JSON-stringified)

CREATE TABLE IF NOT EXISTS customers (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company TEXT DEFAULT '',
    initials TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    statusColor TEXT DEFAULT 'bg-[#008A00]/10 text-[#008A00]',
    contactPerson TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    gst TEXT DEFAULT '',
    customerType TEXT DEFAULT 'Brand',
    paymentTerms TEXT DEFAULT '',
    creditLimit REAL DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    country TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    isActive INTEGER DEFAULT 1,
    customerCode TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    customerName TEXT DEFAULT '',
    customerId TEXT DEFAULT '',
    costingId TEXT DEFAULT '',
    product TEXT DEFAULT '',
    sizes TEXT DEFAULT '[]',
    colours TEXT DEFAULT '[]',
    qty INTEGER DEFAULT 0,
    unitPrice REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    shipping REAL DEFAULT 0,
    grandTotal REAL DEFAULT 0,
    value REAL DEFAULT 0,
    incurredCost REAL DEFAULT 0,
    quotedCost REAL DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    statusColor TEXT DEFAULT 'bg-surface-variant text-secondary',
    dateMonth TEXT DEFAULT '',
    dateDay TEXT DEFAULT '',
    deliveryDate TEXT DEFAULT '',
    priority TEXT DEFAULT 'Normal',
    factory TEXT DEFAULT '',
    productionManager TEXT DEFAULT '',
    merchandiser TEXT DEFAULT '',
    progressPercentage REAL DEFAULT 0,
    progressLabel TEXT DEFAULT '',
    progressColor TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    timeline TEXT DEFAULT '[]',
    tasks TEXT DEFAULT '[]',
    expenses TEXT DEFAULT '[]',
    paymentStatus TEXT DEFAULT '',
    paymentReceived REAL DEFAULT 0,
    fabric TEXT DEFAULT '',
    activityLog TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    sku TEXT DEFAULT '',
    quantity REAL DEFAULT 0,
    unit TEXT DEFAULT '',
    status TEXT DEFAULT 'In Stock',
    statusColor TEXT DEFAULT 'bg-[#008A00]/10 text-[#008A00]',
    icon TEXT DEFAULT 'inventory_2',
    iconColor TEXT DEFAULT 'bg-primary/10 text-primary',
    historicalAvgConsumption REAL DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS batches (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    orderId TEXT DEFAULT '',
    description TEXT DEFAULT '',
    phase TEXT DEFAULT '',
    progress REAL DEFAULT 0,
    progressColor TEXT DEFAULT '',
    expenses TEXT DEFAULT '[]',
    consumptions TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT '',
    amount REAL DEFAULT 0,
    date TEXT DEFAULT '',
    category TEXT DEFAULT '',
    status TEXT DEFAULT '',
    description TEXT DEFAULT '',
    refId TEXT DEFAULT '',
    title TEXT DEFAULT '',
    amountColor TEXT DEFAULT '',
    isNegative INTEGER DEFAULT 0,
    icon TEXT DEFAULT '',
    iconBg TEXT DEFAULT '',
    iconColor TEXT DEFAULT '',
    linkedBatchId TEXT DEFAULT '',
    linkedOrderId TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS costings (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    styleRef TEXT DEFAULT '',
    clientId TEXT DEFAULT '',
    totalUnitCost REAL DEFAULT 0,
    retailPrice REAL DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    date TEXT DEFAULT '',
    materials TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipments (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    customerName TEXT DEFAULT '',
    invoiceNo TEXT DEFAULT '',
    status TEXT DEFAULT '',
    courier TEXT DEFAULT '',
    trackingNo TEXT DEFAULT '',
    expectedDate TEXT DEFAULT '',
    boxes INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotations (
    _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT UNIQUE NOT NULL,
    customerId TEXT NOT NULL,
    customerName TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Draft',
    showFabric INTEGER DEFAULT 0,
    showColour INTEGER DEFAULT 0,
    showTax INTEGER DEFAULT 1,
    items TEXT DEFAULT '[]',
    totalAmount REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);
