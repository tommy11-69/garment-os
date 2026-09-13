const fs = require('fs');

const dumpSql = fs.readFileSync('backend/mariadb_backup.sql', 'utf8');
const dummySql = fs.readFileSync('C:\\Users\\ASUS\\Downloads\\garment_os_dummy_data.sql', 'utf8');

// Extract clean CREATE TABLE statements from mariadb_backup.sql
const createTablesMatch = dumpSql.match(/CREATE TABLE[\s\S]*?\);/g);
let cleanSchema = `-- Garment OS Hostinger Complete Multi-Table Setup & Dummy Data
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

`;

if (createTablesMatch) {
    createTablesMatch.forEach(block => {
        let statement = block.trim();
        statement = statement.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');
        statement = statement.replace(/ LONGTEXT DEFAULT '',/g, ' LONGTEXT,');
        statement = statement.replace(/ status LONGTEXT DEFAULT 'Active',/g, " status VARCHAR(191) DEFAULT 'Active',");
        statement = statement.replace(/ statusColor LONGTEXT DEFAULT '[^']+',/g, " statusColor VARCHAR(191) DEFAULT 'bg-[#008A00]/10 text-[#008A00]',");
        statement = statement.replace(/ customerType LONGTEXT DEFAULT 'Brand',/g, " customerType VARCHAR(191) DEFAULT 'Brand',");
        statement = statement.replace(/ currency LONGTEXT DEFAULT 'INR',/g, " currency VARCHAR(191) DEFAULT 'INR',");
        statement = statement.replace(/ status LONGTEXT DEFAULT 'Draft',/g, " status VARCHAR(191) DEFAULT 'Draft',");
        statement = statement.replace(/ priority LONGTEXT DEFAULT 'Normal',/g, " priority VARCHAR(191) DEFAULT 'Normal',");
        statement = statement.replace(/ status LONGTEXT DEFAULT 'In Stock',/g, " status VARCHAR(191) DEFAULT 'In Stock',");
        statement = statement.replace(/ icon LONGTEXT DEFAULT 'inventory_2',/g, " icon VARCHAR(191) DEFAULT 'inventory_2',");
        statement = statement.replace(/ iconColor LONGTEXT DEFAULT '[^']+',/g, " iconColor VARCHAR(191) DEFAULT 'bg-primary/10 text-primary',");
        statement = statement.replace(/ status LONGTEXT DEFAULT 'Saved',/g, " status VARCHAR(191) DEFAULT 'Saved',");
        cleanSchema += statement + '\n\n';
    });
}

// Convert dummy data INSERT statements
const dummyLines = dummySql.split(/\r?\n/);
cleanSchema += '-- Dummy Insert Statements\n\n';

for (let line of dummyLines) {
    if (line.startsWith('INSERT INTO')) {
        let cleanLine = line;
        // Replace SQLite double quoted columns with MariaDB backticks
        cleanLine = cleanLine.replace(/"([a-zA-Z0-9_]+)"/g, '`$1`');
        // Replace stray backticks inside string literals with double quotes for valid JSON
        cleanLine = cleanLine.replace(/`([^`\s,()]+)`/g, (m, p1) => {
            const tableCols = ['customers', 'orders', 'inventory', 'batches', 'transactions', 'costings', 'quotations', 'shipments', 'vendors', '_rowid', 'id', 'name', 'company', 'initials', 'avatar', 'email', 'phone', 'status', 'statusColor', 'contactPerson', 'whatsapp', 'gst', 'customerType', 'paymentTerms', 'creditLimit', 'currency', 'address', 'city', 'state', 'country', 'pincode', 'notes', 'isActive', 'customerCode', 'createdAt', 'updatedAt', 'sizes', 'colours', 'product', 'qty', 'unitPrice', 'subtotal', 'discount', 'tax', 'shipping', 'grandTotal', 'value', 'incurredCost', 'quotedCost', 'deliveryDate', 'priority', 'factory', 'productionManager', 'merchandiser', 'progressPercentage', 'progressLabel', 'paymentStatus', 'paymentReceived', 'fabric', 'timeline', 'tasks', 'expenses', 'activityLog', 'products', 'costingId', 'customerId', 'customerName', 'progressColor', 'historicalAvgConsumption', 'icon', 'iconColor', 'sku', 'quantity', 'unit', 'phase', 'progress', 'consumptions', 'orderId', 'description', 'type', 'amount', 'date', 'category', 'refId', 'title', 'amountColor', 'isNegative', 'iconBg', 'linkedBatchId', 'linkedOrderId', 'paymentMethod', 'referenceNo', 'createdBy', 'styleRef', 'clientId', 'totalUnitCost', 'retailPrice', 'materials', 'uData', 'showFabric', 'showColour', 'showTax', 'items', 'totalAmount'];
            return tableCols.includes(p1) ? '`' + p1 + '`' : '"' + p1 + '"';
        });
        cleanSchema += cleanLine + '\n';
    }
}

cleanSchema += '\nCOMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n';

fs.writeFileSync('C:\\Users\\ASUS\\Downloads\\garment_os_dummy_data_mariadb.sql', cleanSchema, 'utf8');
console.log('Master Hostinger SQL generated!');
