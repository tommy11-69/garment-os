<?php
/**
 * Garment OS — High Performance MariaDB REST API for Hostinger LiteSpeed / PHP 8.3
 * Drop-in replacement for worker.js — accepts exact same endpoints and requests.
 */

error_reporting(0);
ini_set('display_errors', '0');

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Database Connection ──────────────────────────────────────────────
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database configuration file api/config.php not found.']);
    exit;
}
$dbConfig = require $configFile;

// Function to connect to target DB
function connectDatabase($config, $isDemo = false) {
    $dbName = $isDemo ? $config['demo_database'] : $config['database'];
    $dbUser = $isDemo ? $config['demo_username'] : $config['username'];
    $dbPass = $isDemo ? $config['demo_password'] : $config['password'];

    $dsn = "mysql:host={$config['host']};dbname={$dbName};charset={$config['charset']}";
    return new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
}

try {
    $pdo = connectDatabase($dbConfig, false);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Main database connection failed: ' . $e->getMessage()]);
    exit;
}

// ── Helpers ──────────────────────────────────────────────────────────
const ALLOWED_TABLES = [
    'customers', 'orders', 'inventory', 'batches',
    'transactions', 'costings', 'shipments', 'quotations', 'vendors'
];

const JSON_COLUMNS = [
    'orders'      => ['sizes', 'colours', 'timeline', 'tasks', 'expenses', 'activityLog', 'stageData', 'products'],
    'batches'     => ['expenses', 'consumptions'],
    'costings'    => ['materials', 'uData'],
    'quotations'  => ['items']
];

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function hydrateRow($table, $row) {
    if (!$row) return null;
    unset($row['_rowid']);
    
    $jsonCols = JSON_COLUMNS[$table] ?? [];
    foreach ($jsonCols as $col) {
        if (isset($row[$col])) {
            if (is_string($row[$col])) {
                $raw = $row[$col];
                if (strpos($raw, '`') !== false) {
                    $raw = str_replace('`', '"', $raw);
                }
                $decoded = json_decode($raw, true);
                $row[$col] = (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : [];
            } elseif (!is_array($row[$col])) {
                $row[$col] = [];
            }
        } else {
            $row[$col] = [];
        }
    }
    // Booleans
    foreach (['isActive', 'showFabric', 'showColour', 'showTax', 'isNegative'] as $boolField) {
        if (isset($row[$boolField])) {
            $row[$boolField] = (bool)$row[$boolField];
        }
    }
    // Numbers
    foreach (['creditLimit', 'unitPrice', 'subtotal', 'discount', 'tax', 'shipping', 'grandTotal', 'value', 'incurredCost', 'quotedCost', 'progressPercentage', 'paymentReceived', 'quantity', 'historicalAvgConsumption', 'progress', 'amount', 'totalUnitCost', 'retailPrice', 'totalAmount', 'boxes', 'qty'] as $numField) {
        if (isset($row[$numField]) && is_numeric($row[$numField])) {
            $row[$numField] = strpos($row[$numField], '.') !== false ? (float)$row[$numField] : (int)$row[$numField];
        }
    }
    return $row;
}

function dehydrateData($table, $data) {
    $jsonCols = JSON_COLUMNS[$table] ?? [];
    foreach ($jsonCols as $col) {
        if (isset($data[$col]) && !is_string($data[$col])) {
            $data[$col] = json_encode($data[$col]);
        }
    }
    foreach (['isActive', 'showFabric', 'showColour', 'showTax', 'isNegative'] as $boolField) {
        if (isset($data[$boolField])) {
            $data[$boolField] = $data[$boolField] ? 1 : 0;
        }
    }
    return $data;
}

function isSafeFieldName($field) {
    return is_string($field) && preg_match('/^[a-zA-Z0-9_]+$/', trim($field));
}

// ── Routing & URL Parsing ────────────────────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'];
$uriPath = parse_url($requestUri, PHP_URL_PATH);

// Normalize path relative to api root
$apiPrefix = '/api';
$pos = strpos($uriPath, $apiPrefix);
if ($pos !== false) {
    $relPath = substr($uriPath, $pos + strlen($apiPrefix));
} else {
    $relPath = $uriPath;
}
$relPath = trim($relPath, '/');
$segments = $relPath === '' ? [] : explode('/', $relPath);

$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: [];

// Auto-migrate schema fixes
try {
    $colInfo = $pdo->query("SHOW COLUMNS FROM `sessions` LIKE 'expiresAt'")->fetch();
    if ($colInfo && strpos(strtolower($colInfo['Type']), 'bigint') === false) {
        $pdo->exec("ALTER TABLE `sessions` MODIFY `expiresAt` BIGINT NOT NULL");
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS `vendors` (
        `_rowid` INT AUTO_INCREMENT PRIMARY KEY,
        `id` VARCHAR(191) UNIQUE NOT NULL,
        `name` LONGTEXT NOT NULL,
        `contactPerson` LONGTEXT DEFAULT '',
        `phone` LONGTEXT DEFAULT '',
        `email` LONGTEXT DEFAULT '',
        `address` LONGTEXT DEFAULT '',
        `city` LONGTEXT DEFAULT '',
        `state` LONGTEXT DEFAULT '',
        `pincode` LONGTEXT DEFAULT '',
        `gstin` LONGTEXT DEFAULT '',
        `vendorType` LONGTEXT DEFAULT 'Other',
        `paymentTerms` LONGTEXT DEFAULT '',
        `bankName` LONGTEXT DEFAULT '',
        `accountNumber` LONGTEXT DEFAULT '',
        `ifsc` LONGTEXT DEFAULT '',
        `upiId` LONGTEXT DEFAULT '',
        `notes` LONGTEXT DEFAULT '',
        `status` LONGTEXT DEFAULT 'Active',
        `statusColor` LONGTEXT DEFAULT 'bg-[#008A00]/10 text-[#008A00]',
        `isActive` INT DEFAULT 1,
        `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) { /* ignore */ }

try {

// ── Route: /api/health ───────────────────────────────────────────────
if ($relPath === 'health') {
    jsonResponse([
        'status' => 'healthy',
        'timestamp' => date('c'),
        'db' => 'MariaDB'
    ]);
}

// ── Route: /api/auth/login ───────────────────────────────────────────
if ($relPath === 'auth/login') {
    if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password) {
        jsonResponse(['error' => 'Username and password required'], 400);
    }

    // 1. Guest / Showcase Login Check
    if (($username === 'guest' && $password === 'guest123') || ($username === 'demo' && $password === 'demo123')) {
        $token = 'demo-' . bin2hex(random_bytes(16));
        $expiresAt = (time() + 86400 * 7) * 1000;
        
        // Connect to Demo DB and store session there
        try {
            $demoPdo = connectDatabase($dbConfig, true);
            // Ensure sessions table exists in demo db
            $demoPdo->exec("CREATE TABLE IF NOT EXISTS `sessions` (`token` VARCHAR(191) PRIMARY KEY, `userId` VARCHAR(191) NOT NULL, `expiresAt` BIGINT NOT NULL, `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP)");
            $stmt = $demoPdo->prepare('INSERT INTO sessions (`token`, `userId`, `expiresAt`) VALUES (?, ?, ?)');
            $stmt->execute([$token, 'guest-user', $expiresAt]);
        } catch (Exception $e) {
            jsonResponse(['error' => 'Demo database error: ' . $e->getMessage()], 500);
        }

        jsonResponse(['success' => true, 'token' => $token, 'userId' => 'guest-user', 'userType' => 'Guest (Showcase Mode)']);
    }

    $passwordHash = hash('sha256', $password);

    // 2. Hardcoded developer admin fallback
    if ($username === 'admin' && $password === 'admin123') {
        $token = bin2hex(random_bytes(16));
        $expiresAt = (time() + 86400 * 7) * 1000;
        $stmt = $pdo->prepare('INSERT INTO sessions (`token`, `userId`, `expiresAt`) VALUES (?, ?, ?)');
        $stmt->execute([$token, 'dev-admin', $expiresAt]);
        jsonResponse(['success' => true, 'token' => $token, 'userId' => 'dev-admin', 'userType' => 'Developer (Fallback)']);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE `username` = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || $user['password_hash'] !== $passwordHash) {
        jsonResponse(['error' => 'Invalid username or password'], 401);
    }

    $token = bin2hex(random_bytes(16));
    $expiresAt = (time() + 86400 * 7) * 1000;
    $stmt = $pdo->prepare('INSERT INTO sessions (`token`, `userId`, `expiresAt`) VALUES (?, ?, ?)');
    $stmt->execute([$token, $user['id'], $expiresAt]);

    jsonResponse(['success' => true, 'token' => $token, 'userId' => $user['id'], 'userType' => 'Administrator']);
}

// ── Auth Token Verification for all other API endpoints ──────────────
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!$authHeader && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}
if (!$authHeader && isset($_SERVER['PHP_AUTH_BEARER'])) {
    $authHeader = 'Bearer ' . $_SERVER['PHP_AUTH_BEARER'];
}

if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
    jsonResponse(['error' => 'Unauthorized: No token provided'], 401);
}

$token = trim(substr($authHeader, 7));
$isDemoSession = str_starts_with($token, 'demo-');

// Switch active database connection based on token type
if ($isDemoSession) {
    try {
        $pdo = connectDatabase($dbConfig, true);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to connect to Demo Database: ' . $e->getMessage()], 500);
    }
}

$nowMs = round(microtime(true) * 1000);
$stmt = $pdo->prepare('SELECT * FROM sessions WHERE `token` = ? AND `expiresAt` > ?');
$stmt->execute([$token, $nowMs]);
$session = $stmt->fetch();

if (!$session) {
    jsonResponse(['error' => 'Unauthorized: Invalid or expired token'], 401);
}


// ── Route: /api/auth/credentials ─────────────────────────────────────
if ($relPath === 'auth/credentials') {
    if ($method !== 'PUT') jsonResponse(['error' => 'Method not allowed'], 405);
    if ($session['userId'] === 'dev-admin') {
        jsonResponse(['error' => 'Developer credentials are hardcoded and cannot be changed'], 403);
    }

    $updateSql = [];
    $params = [];
    if (!empty($body['username'])) {
        $updateSql[] = '`username` = ?';
        $params[] = trim($body['username']);
    }
    if (!empty($body['password'])) {
        $updateSql[] = '`password_hash` = ?';
        $params[] = hash('sha256', $body['password']);
    }

    if (!empty($updateSql)) {
        $params[] = $session['userId'];
        $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $updateSql) . ' WHERE `id` = ?');
        $stmt->execute($params);

        if (!empty($body['password'])) {
            $stmt = $pdo->prepare('DELETE FROM sessions WHERE `userId` = ?');
            $stmt->execute([$session['userId']]);
        }
    }
    jsonResponse(['success' => true]);
}

// ── REST Collections ─────────────────────────────────────────────────
$table = $segments[0] ?? '';
$id = $segments[1] ?? null;

if (!in_array($table, ALLOWED_TABLES, true)) {
    jsonResponse(['error' => "Collection '{$table}' not found"], 404);
}

// Helper to fetch valid column names for the table
$colStmt = $pdo->prepare("SHOW COLUMNS FROM `{$table}`");
$colStmt->execute();
$tableCols = array_column($colStmt->fetchAll(), 'Field');
$validColumns = array_diff($tableCols, ['_rowid']);

// 1. GET (Single, Search, Paginated, or All)
if ($method === 'GET') {
    if ($id !== null) {
        $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `id` = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Item not found'], 404);
        jsonResponse(hydrateRow($table, $row));
    }

    $q = $_GET['q'] ?? null;
    $fields = $_GET['fields'] ?? null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;

    $whereClause = '';
    $params = [];

    if ($q && $fields) {
        $safeFields = array_filter(array_map('trim', explode(',', $fields)), 'isSafeFieldName');
        if (!empty($safeFields)) {
            $conditions = [];
            foreach ($safeFields as $sf) {
                $conditions[] = "`{$sf}` LIKE ?";
                $params[] = "%{$q}%";
            }
            $whereClause = 'WHERE ' . implode(' OR ', $conditions);
        }
    }

    if ($limit > 0) {
        $offset = ($page - 1) * $limit;
        $countStmt = $pdo->prepare("SELECT COUNT(*) as total FROM `{$table}` {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetch()['total'];

        $dataStmt = $pdo->prepare("SELECT * FROM `{$table}` {$whereClause} ORDER BY createdAt DESC LIMIT {$limit} OFFSET {$offset}");
        $dataStmt->execute($params);
        $rows = $dataStmt->fetchAll();

        jsonResponse([
            'data'       => array_map(fn($r) => hydrateRow($table, $r), $rows),
            'total'      => $total,
            'page'       => $page,
            'totalPages' => ceil($total / $limit)
        ]);
    }

    $stmt = $pdo->prepare("SELECT * FROM `{$table}` {$whereClause} ORDER BY createdAt DESC");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    jsonResponse(array_map(fn($r) => hydrateRow($table, $r), $rows));
}

// 2. POST (Insert)
if ($method === 'POST') {
    $data = dehydrateData($table, $body);
    if (empty($data['id'])) {
        $data['id'] = substr($table, 0, 1) . '-' . round(microtime(true) * 1000);
    }
    unset($data['_id'], $data['_rowid']);

    $now = date('Y-m-d\TH:i:s.v\Z');
    $data['createdAt'] = $now;
    $data['updatedAt'] = $now;

    $insertCols = array_intersect(array_keys($data), $validColumns);
    $colsList = implode(', ', array_map(fn($c) => "`{$c}`", $insertCols));
    $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));
    $values = array_map(fn($c) => $data[$c], $insertCols);

    $stmt = $pdo->prepare("INSERT INTO `{$table}` ({$colsList}) VALUES ({$placeholders})");
    $stmt->execute(array_values($values));

    $fetchStmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `id` = ?");
    $fetchStmt->execute([$data['id']]);
    $inserted = $fetchStmt->fetch();
    jsonResponse(hydrateRow($table, $inserted), 201);
}

// 3. PUT (Update)
if ($method === 'PUT') {
    if ($id === null) jsonResponse(['error' => 'ID required'], 400);

    $data = dehydrateData($table, $body);
    unset($data['_id'], $data['_rowid'], $data['id'], $data['createdAt']);
    $data['updatedAt'] = date('Y-m-d\TH:i:s.v\Z');

    $updateCols = array_intersect(array_keys($data), $validColumns);
    if (empty($updateCols)) jsonResponse(['error' => 'No valid fields to update'], 400);

    $setList = implode(', ', array_map(fn($c) => "`{$c}` = ?", $updateCols));
    $values = array_map(fn($c) => $data[$c], $updateCols);
    $values[] = $id;

    $stmt = $pdo->prepare("UPDATE `{$table}` SET {$setList} WHERE `id` = ?");
    $stmt->execute(array_values($values));

    $fetchStmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `id` = ?");
    $fetchStmt->execute([$id]);
    $updated = $fetchStmt->fetch();
    if (!$updated) jsonResponse(['error' => 'Item not found'], 404);
    jsonResponse(hydrateRow($table, $updated));
}

// 4. DELETE
if ($method === 'DELETE') {
    if ($id === null) jsonResponse(['error' => 'ID required'], 400);

    $stmt = $pdo->prepare("DELETE FROM `{$table}` WHERE `id` = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) jsonResponse(['error' => 'Item not found'], 404);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Method not allowed'], 405);

} catch (PDOException $pe) {
    jsonResponse(['error' => 'Database Query Error: ' . $pe->getMessage()], 500);
} catch (Throwable $e) {
    jsonResponse(['error' => 'Server Error: ' . $e->getMessage()], 500);
}
