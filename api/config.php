<?php
// Garment OS — Hostinger Database Configuration

return [
    'host'     => getenv('DB_HOST') ?: 'localhost',
    'database' => getenv('DB_NAME') ?: 'u465023737_garment_os', // Replace with your Hostinger DB Name
    'username' => getenv('DB_USER') ?: 'u465023737_garment_admin', // Replace with your Hostinger DB User
    'password' => getenv('DB_PASS') ?: 'Sai@51155', // Replace with your Hostinger DB Password
    'charset'  => 'utf8mb4'
];
