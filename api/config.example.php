<?php
// Garment OS — Hostinger Database Configuration Template
// Copy this file to api/config.php and update with your actual database credentials.
// api/config.php is gitignored and will NOT be tracked or overwritten.

return [
    'host'         => getenv('DB_HOST') ?: 'localhost',
    'database'     => getenv('DB_NAME') ?: 'YOUR_PRODUCTION_DB_NAME',
    'username'     => getenv('DB_USER') ?: 'YOUR_PRODUCTION_DB_USER',
    'password'     => getenv('DB_PASS') ?: 'YOUR_PRODUCTION_DB_PASSWORD',
    'demo_database'=> getenv('DEMO_DB_NAME') ?: 'YOUR_DEMO_DB_NAME',
    'demo_username'=> getenv('DEMO_DB_USER') ?: 'YOUR_DEMO_DB_USER',
    'demo_password'=> getenv('DEMO_DB_PASS') ?: 'YOUR_DEMO_DB_PASSWORD',
    'charset'      => 'utf8mb4'
];
