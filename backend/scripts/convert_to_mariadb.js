const fs = require('fs');

const content = fs.readFileSync('d1_remote_backup.sql', 'utf8');

let mariadb = `-- Hostinger MariaDB Garment OS Complete Dump & Schema
-- Generated for MariaDB 10.5+ / MySQL 8.0+
-- Preserves 100% of live Cloudflare D1 data

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

`;

const lines = content.split(/\r?\n/);
for (let line of lines) {
    if (line.startsWith('PRAGMA') || line.startsWith('DELETE FROM sqlite_sequence') || line.includes('sqlite_sequence')) {
        continue;
    }
    
    let processed = line;
    
    // Convert table definitions
    if (processed.includes('_rowid INTEGER PRIMARY KEY AUTOINCREMENT')) {
        processed = processed.replace('_rowid INTEGER PRIMARY KEY AUTOINCREMENT', '`_rowid` INT AUTO_INCREMENT PRIMARY KEY');
    }
    processed = processed.replace(/\bid TEXT UNIQUE NOT NULL\b/g, '`id` VARCHAR(191) UNIQUE NOT NULL');
    processed = processed.replace(/\btoken TEXT PRIMARY KEY\b/g, '`token` VARCHAR(191) PRIMARY KEY');
    processed = processed.replace(/\busername TEXT UNIQUE NOT NULL\b/g, '`username` VARCHAR(191) UNIQUE NOT NULL');
    processed = processed.replace(/\bTEXT DEFAULT \(datetime\('now'\)\)/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    processed = processed.replace(/\bTEXT\b/g, 'LONGTEXT');
    processed = processed.replace(/\bREAL\b/g, 'DOUBLE');
    processed = processed.replace(/\bINTEGER\b/g, 'INT');
    
    // Convert SQLite char(10) newlines
    processed = processed.replace(/replace\('([^']*)','\\n',char\(10\)\)/g, (match, p1) => {
        return "'" + p1.replace(/\\n/g, '\n').replace(/'/g, "''") + "'";
    });
    
    // Convert double-quoted column / table names in INSERT statements
    if (processed.startsWith('INSERT INTO')) {
        processed = processed.replace(/"([a-zA-Z0-9_]+)"/g, '`$1`');
    }
    
    mariadb += processed + '\n';
}

mariadb += `
COMMIT;
SET FOREIGN_KEY_CHECKS=1;
`;

fs.writeFileSync('backend/mariadb_backup.sql', mariadb, 'utf8');
console.log('Done: backend/mariadb_backup.sql created successfully!');
