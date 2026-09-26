-- ============================================================
-- GARMENT OS — PHASE P1 RELATIONAL DATABASE SCHEMA (V2)
-- Master Relational DDL for MySQL / MariaDB / SQLite (D1)
-- ============================================================

-- 1. CUSTOMERS & CRM
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    company VARCHAR(128) DEFAULT '',
    email VARCHAR(128) DEFAULT '',
    phone VARCHAR(32) DEFAULT '',
    address TEXT,
    city VARCHAR(64) DEFAULT '',
    state VARCHAR(64) DEFAULT '',
    country VARCHAR(64) DEFAULT '',
    pincode VARCHAR(16) DEFAULT '',
    gstin VARCHAR(32) DEFAULT '',
    customer_type VARCHAR(32) DEFAULT 'Brand',
    payment_terms VARCHAR(64) DEFAULT 'Net 30',
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VENDORS / SUPPLIERS
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    vendor_type VARCHAR(64) DEFAULT 'Fabric Mill',
    contact_person VARCHAR(128) DEFAULT '',
    phone VARCHAR(32) DEFAULT '',
    email VARCHAR(128) DEFAULT '',
    address TEXT,
    gstin VARCHAR(32) DEFAULT '',
    payment_terms VARCHAR(64) DEFAULT 'Net 30',
    rating DECIMAL(3,2) DEFAULT 5.00,
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. WORKFLOW PRESETS & VERSIONED SNAPSHOTS
CREATE TABLE IF NOT EXISTS workflow_presets (
    id VARCHAR(64) PRIMARY KEY,
    preset_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_preset_stages (
    id VARCHAR(64) PRIMARY KEY,
    preset_id VARCHAR(64) NOT NULL,
    stage_code VARCHAR(32) NOT NULL,
    stage_name VARCHAR(128) NOT NULL,
    sequence_order INTEGER NOT NULL,
    is_optional INTEGER DEFAULT 0,
    default_execution_mode VARCHAR(16) DEFAULT 'IN_HOUSE',
    FOREIGN KEY (preset_id) REFERENCES workflow_presets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_preset_versions (
    id VARCHAR(64) PRIMARY KEY,
    preset_id VARCHAR(64) NOT NULL,
    version_number INTEGER NOT NULL,
    stages_json TEXT NOT NULL,
    is_current INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preset_id) REFERENCES workflow_presets(id) ON DELETE CASCADE
);

-- 4. ORDERS HEADER & NORMALIZED CHILD TABLES
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(64) UNIQUE NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    priority VARCHAR(16) NOT NULL DEFAULT 'Medium',
    season VARCHAR(32) DEFAULT '',
    customer_po_reference VARCHAR(64) DEFAULT '',
    notes TEXT,
    created_by VARCHAR(64) DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    workflow_preset_id VARCHAR(64) NOT NULL,
    style_code VARCHAR(64) NOT NULL,
    style_name VARCHAR(128) NOT NULL,
    fabric_composition VARCHAR(255) NOT NULL,
    target_gsm INTEGER NOT NULL DEFAULT 180,
    fabric_dia VARCHAR(32) DEFAULT 'Open Width',
    total_quantity INTEGER NOT NULL DEFAULT 0,
    tech_pack_ref VARCHAR(128) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_preset_id) REFERENCES workflow_presets(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_item_variants (
    id VARCHAR(64) PRIMARY KEY,
    order_item_id VARCHAR(64) NOT NULL,
    color_name VARCHAR(64) NOT NULL,
    color_code VARCHAR(32) NOT NULL,
    pantone_ref VARCHAR(32) DEFAULT '',
    total_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_item_sizes (
    id VARCHAR(64) PRIMARY KEY,
    variant_id VARCHAR(64) NOT NULL,
    size_code VARCHAR(16) NOT NULL,
    ratio_factor INTEGER DEFAULT 1,
    ordered_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES order_item_variants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_commercials (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) UNIQUE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    unit_price DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_terms VARCHAR(64) NOT NULL DEFAULT 'Net 30',
    payment_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_status_history (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    remarks TEXT,
    user_id VARCHAR(64) DEFAULT 'SYSTEM',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 5. WORK ORDERS & PRODUCTION EXECUTION
CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(64) PRIMARY KEY,
    work_order_number VARCHAR(64) UNIQUE NOT NULL,
    order_item_id VARCHAR(64) UNIQUE NOT NULL,
    workflow_version_id VARCHAR(64) NOT NULL,
    planned_quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (workflow_version_id) REFERENCES workflow_preset_versions(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stage_executions (
    id VARCHAR(64) PRIMARY KEY,
    work_order_id VARCHAR(64) NOT NULL,
    stage_code VARCHAR(32) NOT NULL,
    sequence_order INTEGER NOT NULL,
    execution_mode VARCHAR(16) NOT NULL DEFAULT 'IN_HOUSE',
    vendor_id VARCHAR(64) DEFAULT NULL,
    assigned_line_or_machine VARCHAR(64) DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    planned_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    input_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    good_output_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    consumed_downstream_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    rework_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    scrap_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit_of_measure VARCHAR(16) NOT NULL DEFAULT 'Pcs',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stage_quantity_ledger (
    id VARCHAR(64) PRIMARY KEY,
    stage_execution_id VARCHAR(64) NOT NULL,
    entry_type VARCHAR(32) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_of_measure VARCHAR(16) NOT NULL DEFAULT 'Pcs',
    source_reference_type VARCHAR(32) DEFAULT NULL,
    source_reference_id VARCHAR(64) DEFAULT NULL,
    notes TEXT,
    operator_user_id VARCHAR(64) DEFAULT 'OPERATOR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stage_execution_id) REFERENCES stage_executions(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS production_bundles (
    id VARCHAR(64) PRIMARY KEY,
    work_order_id VARCHAR(64) NOT NULL,
    variant_id VARCHAR(64) NOT NULL,
    bundle_barcode VARCHAR(64) UNIQUE NOT NULL,
    size_code VARCHAR(16) NOT NULL,
    ply_start INTEGER NOT NULL,
    ply_end INTEGER NOT NULL,
    piece_count INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Cut',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES order_item_variants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bundle_tickets (
    id VARCHAR(64) PRIMARY KEY,
    bundle_id VARCHAR(64) NOT NULL,
    stage_execution_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    operator_user_id VARCHAR(64) DEFAULT 'OPERATOR',
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bundle_id) REFERENCES production_bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_execution_id) REFERENCES stage_executions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stage_qc_logs (
    id VARCHAR(64) PRIMARY KEY,
    stage_execution_id VARCHAR(64) NOT NULL,
    inspection_type VARCHAR(32) NOT NULL,
    sample_size INTEGER NOT NULL,
    defects_count INTEGER NOT NULL DEFAULT 0,
    result VARCHAR(16) NOT NULL DEFAULT 'PASS',
    defect_breakdown TEXT,
    photo_urls TEXT,
    inspector_user_id VARCHAR(64) DEFAULT 'QA_INSPECTOR',
    inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stage_execution_id) REFERENCES stage_executions(id) ON DELETE CASCADE
);

-- 6. INVENTORY, RESERVATIONS & MATERIAL MOVEMENTS
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    item_code VARCHAR(64) UNIQUE NOT NULL,
    item_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'Fabric',
    unit_of_measure VARCHAR(16) NOT NULL DEFAULT 'Kgs',
    current_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    allocated_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    available_stock DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    min_stock DECIMAL(12,2) DEFAULT 0.00,
    unit_cost DECIMAL(12,4) DEFAULT 0.0000,
    location VARCHAR(64) DEFAULT 'Warehouse A',
    status VARCHAR(32) DEFAULT 'In Stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id VARCHAR(64) PRIMARY KEY,
    item_id VARCHAR(64) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(12,4) DEFAULT 0.0000,
    reference_type VARCHAR(32) NOT NULL,
    reference_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) DEFAULT 'SYSTEM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS material_reservations (
    id VARCHAR(64) PRIMARY KEY,
    work_order_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) NOT NULL,
    reserved_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    issued_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(16) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS material_issues (
    id VARCHAR(64) PRIMARY KEY,
    issue_number VARCHAR(64) UNIQUE NOT NULL,
    reservation_id VARCHAR(64) NOT NULL,
    quantity_issued DECIMAL(12,2) NOT NULL,
    issued_by VARCHAR(64) DEFAULT 'STORE_CLERK',
    received_by VARCHAR(64) DEFAULT 'CUTTING_MASTER',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES material_reservations(id) ON DELETE RESTRICT
);

-- 7. DISPATCH, CARTONIZATION & GATE PASSES
CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(64) PRIMARY KEY,
    shipment_number VARCHAR(64) UNIQUE NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    transporter_name VARCHAR(128) NOT NULL,
    tracking_number VARCHAR(64) DEFAULT '',
    vehicle_number VARCHAR(32) DEFAULT '',
    driver_phone VARCHAR(32) DEFAULT '',
    e_way_bill_number VARCHAR(64) DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'Booked',
    dispatched_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS shipment_cartons (
    id VARCHAR(64) PRIMARY KEY,
    work_order_id VARCHAR(64) NOT NULL,
    shipment_id VARCHAR(64) DEFAULT NULL,
    carton_barcode VARCHAR(64) UNIQUE NOT NULL,
    gross_weight_kg DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    net_weight_kg DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    total_pieces INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'Packed',
    packed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gate_passes (
    id VARCHAR(64) PRIMARY KEY,
    gate_pass_number VARCHAR(64) UNIQUE NOT NULL,
    shipment_id VARCHAR(64) UNIQUE NOT NULL,
    vehicle_number VARCHAR(32) NOT NULL,
    total_cartons INTEGER NOT NULL DEFAULT 0,
    issued_by_user_id VARCHAR(64) DEFAULT 'SECURITY_GATE',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- 8. BILLING & DOUBLE-ENTRY GENERAL LEDGER
CREATE TABLE IF NOT EXISTS billing_master (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(16) NOT NULL DEFAULT 'Unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS billing_items (
    id VARCHAR(64) PRIMARY KEY,
    billing_id VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,4) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (billing_id) REFERENCES billing_master(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    entry_type VARCHAR(8) NOT NULL, -- 'DEBIT' | 'CREDIT'
    account_code VARCHAR(32) NOT NULL, -- '1010_CASH', '1200_AR', '4000_SALES'
    amount DECIMAL(12,2) NOT NULL,
    reference_type VARCHAR(32) NOT NULL, -- 'INVOICE', 'PAYMENT', 'STOCK_ISSUE'
    reference_id VARCHAR(64) NOT NULL,
    transaction_date DATE NOT NULL,
    created_by_user_id VARCHAR(64) DEFAULT 'FINANCE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. SUBCONTRACTING / OUTSOURCED JOB-WORK
CREATE TABLE IF NOT EXISTS subcontract_orders (
    id VARCHAR(64) PRIMARY KEY,
    subcontract_number VARCHAR(64) UNIQUE NOT NULL,
    stage_execution_id VARCHAR(64) NOT NULL,
    vendor_id VARCHAR(64) NOT NULL,
    sent_quantity DECIMAL(12,2) NOT NULL,
    received_quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    vendor_scrap_quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit_rate DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    expected_delivery_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'Sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stage_execution_id) REFERENCES stage_executions(id) ON DELETE RESTRICT,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- ============================================================
-- SEED DEFAULT WORKFLOW PRESETS & VERSION 1 SNAPSHOTS
-- ============================================================

INSERT OR IGNORE INTO workflow_presets (id, preset_code, name, description) VALUES
('wp_standard_cmt', 'standard_cmt', 'Standard CMT (Cut-Make-Trim)', 'Procurement -> Cutting -> Stitching -> Finishing -> Packing -> Dispatch'),
('wp_full_vertical', 'full_vertical', 'Full Vertical (Yarn to Garment)', 'Procurement -> Knitting -> Dyeing -> Compacting -> Cutting -> Stitching -> Finishing -> Packing -> Dispatch'),
('wp_print_first', 'print_before_stitch', 'Panel Print / Embellishment First', 'Procurement -> Cutting -> Printing -> Stitching -> Finishing -> Packing -> Dispatch'),
('wp_wash_first', 'wash_before_stitch', 'Garment Washed / Enzyme Treated', 'Procurement -> Cutting -> Stitching -> Garment Wash -> Finishing -> Packing -> Dispatch'),
('wp_stitch_emb', 'stitch_before_embroidery', 'Embroidery on Finished Garment', 'Procurement -> Cutting -> Stitching -> Embroidery -> Finishing -> Packing -> Dispatch'),
('wp_direct_fulfil', 'direct_fulfillment', 'Direct Sourcing & Packaging', 'Procurement -> Final QC -> Packing -> Dispatch');

INSERT OR IGNORE INTO workflow_preset_versions (id, preset_id, version_number, stages_json, is_current) VALUES
('v1_standard_cmt', 'wp_standard_cmt', 1, '[
  {"code":"procurement","name":"Procurement & Sourcing","seq":1,"mode":"IN_HOUSE"},
  {"code":"cutting","name":"Cutting & Bundling","seq":2,"mode":"IN_HOUSE"},
  {"code":"stitching","name":"Stitching Assembly","seq":3,"mode":"IN_HOUSE"},
  {"code":"finishing","name":"Finishing & Tagging","seq":4,"mode":"IN_HOUSE"},
  {"code":"packing","name":"Packing & Cartonization","seq":5,"mode":"IN_HOUSE"},
  {"code":"dispatch","name":"Dispatch & Logistics","seq":6,"mode":"IN_HOUSE"}
]', 1),
('v1_print_first', 'wp_print_first', 1, '[
  {"code":"procurement","name":"Procurement & Sourcing","seq":1,"mode":"IN_HOUSE"},
  {"code":"cutting","name":"Cutting & Bundling","seq":2,"mode":"IN_HOUSE"},
  {"code":"printing","name":"Screen / DTG Printing","seq":3,"mode":"OUTSOURCED"},
  {"code":"stitching","name":"Stitching Assembly","seq":4,"mode":"IN_HOUSE"},
  {"code":"finishing","name":"Finishing & Tagging","seq":5,"mode":"IN_HOUSE"},
  {"code":"packing","name":"Packing & Cartonization","seq":6,"mode":"IN_HOUSE"},
  {"code":"dispatch","name":"Dispatch & Logistics","seq":7,"mode":"IN_HOUSE"}
]', 1),
('v1_wash_first', 'wp_wash_first', 1, '[
  {"code":"procurement","name":"Procurement & Sourcing","seq":1,"mode":"IN_HOUSE"},
  {"code":"cutting","name":"Cutting & Bundling","seq":2,"mode":"IN_HOUSE"},
  {"code":"stitching","name":"Stitching Assembly","seq":3,"mode":"IN_HOUSE"},
  {"code":"garment_wash","name":"Garment Washing","seq":4,"mode":"OUTSOURCED"},
  {"code":"finishing","name":"Finishing & Tagging","seq":5,"mode":"IN_HOUSE"},
  {"code":"packing","name":"Packing & Cartonization","seq":6,"mode":"IN_HOUSE"},
  {"code":"dispatch","name":"Dispatch & Logistics","seq":7,"mode":"IN_HOUSE"}
]', 1);
