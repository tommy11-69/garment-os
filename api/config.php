<?php
// Garment OS — Hostinger Database Configuration

return [
    'host'         => getenv('DB_HOST') ?: 'localhost',
    'database'     => getenv('DB_NAME') ?: 'u465023737_garment_os', 
    'username'     => getenv('DB_USER') ?: 'u465023737_garment_admin', 
    'password'     => getenv('DB_PASS') ?: 'Sai@51155', 
    'demo_database'=> getenv('DEMO_DB_NAME') ?: 'u465023737_garmentosdemo',
    'demo_username'=> getenv('DEMO_DB_USER') ?: 'u465023737_garmentosguest',
    'demo_password'=> getenv('DEMO_DB_PASS') ?: 'Garment@Demo1',
    'charset'      => 'utf8mb4'
];
