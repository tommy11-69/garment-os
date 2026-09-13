const fs = require('fs');

const inputFile = 'C:\\Users\\ASUS\\Downloads\\garment_os_dummy_data.sql';
const outputFile = 'C:\\Users\\ASUS\\Downloads\\garment_os_dummy_data_mariadb.sql';

if (!fs.existsSync(inputFile)) {
    console.error('Input file not found:', inputFile);
    process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');

let mariadb = `-- Hostinger MariaDB Garment OS Dummy Data Dump
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

`;

const lines = content.split(/\r?\n/);
let inInsertSection = false;

for (let line of lines) {
    if (line.startsWith('PRAGMA') || line.startsWith('DELETE FROM sqlite_sequence') || line.includes('sqlite_sequence') || line.includes('BEGIN TRANSACTION')) continue;
    let processed = line;
    
    // Add CREATE TABLE IF NOT EXISTS support
    if (processed.startsWith('CREATE TABLE ')) {
        processed = processed.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ');
    }

    if (processed.includes('_rowid INTEGER PRIMARY KEY AUTOINCREMENT')) {
        processed = processed.replace('_rowid INTEGER PRIMARY KEY AUTOINCREMENT', '`_rowid` INT AUTO_INCREMENT PRIMARY KEY');
    }
    processed = processed.replace(/\bid TEXT UNIQUE NOT NULL\b/g, '`id` VARCHAR(191) UNIQUE NOT NULL');
    processed = processed.replace(/\btoken TEXT PRIMARY KEY\b/g, '`token` VARCHAR(191) PRIMARY KEY');
    processed = processed.replace(/\busername TEXT UNIQUE NOT NULL\b/g, '`username` VARCHAR(191) UNIQUE NOT NULL');
    processed = processed.replace(/\bTEXT DEFAULT \(datetime\('now'\)\)/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    processed = processed.replace(/company LONGTEXT DEFAULT '',/g, "company LONGTEXT,");
    processed = processed.replace(/initials LONGTEXT DEFAULT '',/g, "initials LONGTEXT,");
    processed = processed.replace(/avatar LONGTEXT DEFAULT '',/g, "avatar LONGTEXT,");
    processed = processed.replace(/email LONGTEXT DEFAULT '',/g, "email LONGTEXT,");
    processed = processed.replace(/phone LONGTEXT DEFAULT '',/g, "phone LONGTEXT,");
    processed = processed.replace(/status LONGTEXT DEFAULT 'Active',/g, "status VARCHAR(191) DEFAULT 'Active',");
    processed = processed.replace(/statusColor LONGTEXT DEFAULT 'bg-[#008A00]\/10 text-[#008A00]',/g, "statusColor VARCHAR(191) DEFAULT 'bg-[#008A00]/10 text-[#008A00]',");
    processed = processed.replace(/contactPerson LONGTEXT DEFAULT '',/g, "contactPerson LONGTEXT,");
    processed = processed.replace(/whatsapp LONGTEXT DEFAULT '',/g, "whatsapp LONGTEXT,");
    processed = processed.replace(/gst LONGTEXT DEFAULT '',/g, "gst LONGTEXT,");
    processed = processed.replace(/customerType LONGTEXT DEFAULT 'Brand',/g, "customerType VARCHAR(191) DEFAULT 'Brand',");
    processed = processed.replace(/paymentTerms LONGTEXT DEFAULT '',/g, "paymentTerms LONGTEXT,");
    processed = processed.replace(/currency LONGTEXT DEFAULT 'INR',/g, "currency VARCHAR(191) DEFAULT 'INR',");
    processed = processed.replace(/address LONGTEXT DEFAULT '',/g, "address LONGTEXT,");
    processed = processed.replace(/city LONGTEXT DEFAULT '',/g, "city LONGTEXT,");
    processed = processed.replace(/state LONGTEXT DEFAULT '',/g, "state LONGTEXT,");
    processed = processed.replace(/country LONGTEXT DEFAULT '',/g, "country LONGTEXT,");
    processed = processed.replace(/pincode LONGTEXT DEFAULT '',/g, "pincode LONGTEXT,");
    processed = processed.replace(/notes LONGTEXT DEFAULT '',/g, "notes LONGTEXT,");
    processed = processed.replace(/customerCode LONGTEXT DEFAULT '',/g, "customerCode VARCHAR(191),");
    processed = processed.replace(/\bTEXT\b/g, 'LONGTEXT');
    processed = processed.replace(/\bREAL\b/g, 'DOUBLE');
    processed = processed.replace(/\bINTEGER\b/g, 'INT');
    processed = processed.replace(/replace\('([^']*)','\\n',char\(10\)\)/g, (match, p1) => "'" + p1.replace(/\\n/g, '\n').replace(/'/g, "''") + "'");
    if (processed.startsWith('INSERT INTO')) {
        // Fix stray backticks inside string literals
        processed = processed.replace(/"([a-zA-Z0-9_]+)"/g, '`$1`');
        processed = processed.replace(/`([^`\s,()]+)`/g, (m, p1) => {
            return (p1 === 'customers' || p1 === 'orders' || p1 === 'inventory' || p1 === 'batches' || p1 === 'transactions' || p1 === 'costings' || p1 === 'quotations' || p1 === 'shipments' || p1 === '_rowid' || p1 === 'id' || p1 === 'name' || p1 === 'company' || p1 === 'initials' || p1 === 'avatar' || p1 === 'email' || p1 === 'phone' || p1 === 'status' || p1 === 'statusColor' || p1 === 'contactPerson' || p1 === 'whatsapp' || p1 === 'gst' || p1 === 'customerType' || p1 === 'paymentTerms' || p1 === 'creditLimit' || p1 === 'currency' || p1 === 'address' || p1 === 'city' || p1 === 'state' || p1 === 'country' || p1 === 'pincode' || p1 === 'notes' || p1 === 'isActive' || p1 === 'customerCode' || p1 === 'createdAt' || p1 === 'updatedAt' || p1 === 'sizes' || p1 === 'colours' || p1 === 'product' || p1 === 'qty' || p1 === 'unitPrice' || p1 === 'subtotal' || p1 === 'discount' || p1 === 'tax' || p1 === 'shipping' || p1 === 'grandTotal' || p1 === 'value' || p1 === 'incurredCost' || p1 === 'quotedCost' || p1 === 'deliveryDate' || p1 === 'priority' || p1 === 'factory' || p1 === 'productionManager' || p1 === 'merchandiser' || p1 === 'progressPercentage' || p1 === 'progressLabel' || p1 === 'paymentStatus' || p1 === 'paymentReceived' || p1 === 'fabric' || p1 === 'timeline' || p1 === 'tasks' || p1 === 'expenses' || p1 === 'activityLog' || p1 === 'products') ? '`' + p1 + '`' : '"' + p1 + '"';
        });
    }
    mariadb += processed + '\n';
}

// Ensure schema creation statements exist if dummy dataset only contained INSERTS
if (!mariadb.includes('CREATE TABLE IF NOT EXISTS customers')) {
    const schemaContent = fs.readFileSync('backend/mariadb_backup.sql', 'utf8');
    const createStatements = schemaContent.split('INSERT INTO')[0].replace(/^SET FOREIGN_KEY_CHECKS=0;[\s\S]*?START TRANSACTION;\s*/, '');
    mariadb = mariadb.replace('START TRANSACTION;', 'START TRANSACTION;\n\n-- Ensure Table Schemas Exist\n' + createStatements + '\n\n-- Dummy Records\n');
}



mariadb += `
COMMIT;
SET FOREIGN_KEY_CHECKS=1;
`;

fs.writeFileSync(outputFile, mariadb, 'utf8');
console.log('Successfully generated Hostinger MariaDB file:', outputFile);
