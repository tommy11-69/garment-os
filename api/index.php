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
    'quotations'  => ['items'],
    'inventory'   => ['movementHistory', 'specifications']
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
    foreach (['creditLimit', 'unitPrice', 'subtotal', 'discount', 'tax', 'shipping', 'grandTotal', 'value', 'incurredCost', 'quotedCost', 'progressPercentage', 'paymentReceived', 'quantity', 'historicalAvgConsumption', 'progress', 'amount', 'totalUnitCost', 'retailPrice', 'totalAmount', 'boxes', 'qty', 'costPrice', 'totalValue', 'minStock'] as $numField) {
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

    // ── WebAuthn Tables (auto-create) ────────────────────────────────
    $pdo->exec("CREATE TABLE IF NOT EXISTS `webauthn_credentials` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `userId` VARCHAR(191) NOT NULL,
        `credentialId` TEXT NOT NULL,
        `publicKey` LONGTEXT NOT NULL,
        `counter` BIGINT DEFAULT 0,
        `deviceName` VARCHAR(191) DEFAULT 'My Device',
        `deviceAllowed` TINYINT DEFAULT 1,
        `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `webauthn_challenges` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `challenge` VARCHAR(512) NOT NULL,
        `userId` VARCHAR(191) DEFAULT NULL,
        `expiresAt` DATETIME NOT NULL
    )");

    // ── Inventory Columns Migration ──────────────────────────────────
    $invCols = $pdo->query("SHOW COLUMNS FROM `inventory`")->fetchAll();
    $existingInvCols = array_column($invCols, 'Field');
    $neededInvCols = [
        'category'        => "LONGTEXT DEFAULT 'Fabric'",
        'subCategory'     => "LONGTEXT DEFAULT ''",
        'costPrice'       => "DOUBLE DEFAULT 0",
        'totalValue'      => "DOUBLE DEFAULT 0",
        'minStock'        => "DOUBLE DEFAULT 0",
        'location'        => "LONGTEXT DEFAULT ''",
        'supplier'        => "LONGTEXT DEFAULT ''",
        'supplierId'      => "LONGTEXT DEFAULT ''",
        'color'           => "LONGTEXT DEFAULT ''",
        'specifications'  => "LONGTEXT DEFAULT '{}'",
        'notes'           => "LONGTEXT DEFAULT ''",
        'movementHistory' => "LONGTEXT DEFAULT '[]'"
    ];
    foreach ($neededInvCols as $cName => $cDef) {
        if (!in_array($cName, $existingInvCols, true)) {
            $pdo->exec("ALTER TABLE `inventory` ADD COLUMN `{$cName}` {$cDef}");
        }
    }
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
    if (($username === 'guest' && $password === 'guest@183') || ($username === 'demo' && $password === 'demo@183')) {
        $token = 'demo-' . bin2hex(random_bytes(16));
        $expiresAt = (time() + 3600) * 1000; // 1 hour expiration
        
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
        $expiresAt = (time() + 3600) * 1000; // 1 hour expiration
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
    $expiresAt = (time() + 3600) * 1000; // 1 hour expiration
    $stmt = $pdo->prepare('INSERT INTO sessions (`token`, `userId`, `expiresAt`) VALUES (?, ?, ?)');
    $stmt->execute([$token, $user['id'], $expiresAt]);

    jsonResponse(['success' => true, 'token' => $token, 'userId' => $user['id'], 'userType' => 'Administrator']);

}

// ── WebAuthn Helpers ─────────────────────────────────────────────────
function b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode(string $data): string {
    $padded = str_pad(strtr($data, '-_', '+/'), strlen($data) + (4 - strlen($data) % 4) % 4, '=', STR_PAD_RIGHT);
    return base64_decode($padded);
}
function wa_generate_challenge(): string {
    return b64url_encode(random_bytes(32));
}

/**
 * Parse a COSE key (CBOR-encoded) from authData and return a PEM public key.
 * Supports ES256 (alg -7, P-256) and RS256 (alg -257, RSA).
 * Uses a minimal CBOR decoder for the key map only.
 */
function cose_key_to_pem(string $coseBytes): ?string {
    // Minimal CBOR map parser — only handles small integer keys (1-byte) and byte strings
    $pos = 0;
    $len = strlen($coseBytes);
    $map = [];

    $readByte = function() use (&$coseBytes, &$pos) { return ord($coseBytes[$pos++]); };
    $readUint = function($ib) use (&$coseBytes, &$pos, $readByte) {
        $ai = $ib & 0x1f;
        if ($ai < 24) return $ai;
        if ($ai === 24) return $readByte();
        if ($ai === 25) { $v = (ord($coseBytes[$pos]) << 8) | ord($coseBytes[$pos+1]); $pos+=2; return $v; }
        if ($ai === 26) { $v = unpack('N', substr($coseBytes,$pos,4))[1]; $pos+=4; return $v; }
        return 0;
    };

    $ib = $readByte();
    $mt = ($ib & 0xe0) >> 5;
    if ($mt !== 5) return null; // not a map
    $mapLen = $readUint($ib);

    for ($i = 0; $i < $mapLen; $i++) {
        // Key
        $kib = $readByte(); $kmt = ($kib & 0xe0) >> 5;
        $key = ($kmt === 0) ? (int)$readUint($kib) : -(int)($readUint($kib)+1); // neg int
        // Value
        $vib = $readByte(); $vmt = ($vib & 0xe0) >> 5;
        if ($vmt === 2) { // byte string
            $vlen = $readUint($vib);
            $map[$key] = substr($coseBytes, $pos, $vlen); $pos += $vlen;
        } elseif ($vmt === 0 || $vmt === 1) { // uint / nint
            $map[$key] = ($vmt === 0) ? (int)$readUint($vib) : -(int)($readUint($vib)+1);
        } else { $pos += $readUint($vib); } // skip others
    }

    $alg = $map[3] ?? null;
    if ($alg === -7) {
        // ES256: kty=2, crv=1, x=-2, y=-3
        $x = $map[-2] ?? null; $y = $map[-3] ?? null;
        if (!$x || !$y) return null;
        $rawKey = "\x04" . $x . $y; // uncompressed EC point
        $asn1 = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" . $rawKey;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($asn1), 64) . "-----END PUBLIC KEY-----";
    } elseif ($alg === -257) {
        // RS256: n=-1, e=-2
        $n = $map[-1] ?? null; $e = $map[-2] ?? null;
        if (!$n || !$e) return null;
        // Encode as DER RSAPublicKey then wrap in SubjectPublicKeyInfo
        $encInt = function($bytes) {
            $bytes = ltrim($bytes, "\x00");
            if (ord($bytes[0]) & 0x80) $bytes = "\x00" . $bytes;
            $len = strlen($bytes);
            return "\x02" . ($len < 128 ? chr($len) : ("\x81" . chr($len))) . $bytes;
        };
        $rsa = $encInt($n) . $encInt($e);
        $rsa = "\x30" . (strlen($rsa) < 128 ? chr(strlen($rsa)) : "\x81" . chr(strlen($rsa))) . $rsa;
        $oid = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
        $asn1 = $oid . "\x03" . chr(strlen($rsa)+1) . "\x00" . $rsa;
        $asn1 = "\x30" . chr(strlen($asn1)) . $asn1;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($asn1), 64) . "-----END PUBLIC KEY-----";
    }
    return null;
}

// ── Route: /api/auth/webauthn/register-begin ─────────────────────────
// Requires: Bearer token (must be logged in with password first)
// Returns challenge + rp + user options for navigator.credentials.create()
if ($relPath === 'auth/webauthn/register-begin') {
    if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

    // Mini-auth: validate bearer token without going through full auth flow below
    $wAuthHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$wAuthHeader && function_exists('apache_request_headers')) {
        $ah = apache_request_headers();
        $wAuthHeader = $ah['Authorization'] ?? $ah['authorization'] ?? '';
    }
    if (!$wAuthHeader || !str_starts_with($wAuthHeader, 'Bearer ')) jsonResponse(['error' => 'Unauthorized'], 401);
    $wToken = trim(substr($wAuthHeader, 7));
    if (str_starts_with($wToken, 'demo-')) jsonResponse(['error' => 'Biometric login is not available for guest accounts'], 403);
    $nowMs = round(microtime(true) * 1000);
    $wStmt = $pdo->prepare('SELECT * FROM sessions WHERE `token` = ? AND `expiresAt` > ?');
    $wStmt->execute([$wToken, $nowMs]);
    $wSession = $wStmt->fetch();
    if (!$wSession) jsonResponse(['error' => 'Unauthorized: Invalid or expired token'], 401);

    $challenge = wa_generate_challenge();
    $expiresAt = date('Y-m-d H:i:s', time() + 300); // 5 minutes
    $stmt = $pdo->prepare('INSERT INTO webauthn_challenges (`challenge`, `userId`, `expiresAt`) VALUES (?, ?, ?)');
    $stmt->execute([$challenge, $wSession['userId'], $expiresAt]);

    $deviceName = trim($body['deviceName'] ?? 'My Device');
    jsonResponse([
        'challenge'  => $challenge,
        'rp'         => ['id' => $_SERVER['HTTP_HOST'] ?? 'localhost', 'name' => 'Garment OS'],
        'user'       => ['id' => b64url_encode($wSession['userId']), 'name' => $wSession['userId'], 'displayName' => 'Admin'],
        'pubKeyCredParams' => [['type' => 'public-key', 'alg' => -7], ['type' => 'public-key', 'alg' => -257]],
        'authenticatorSelection' => ['userVerification' => 'required'],
        'timeout'    => 60000,
        '_deviceName' => $deviceName,
    ]);
}

// ── Route: /api/auth/webauthn/register-finish ────────────────────────
// Receives attestation from browser, stores public key
if ($relPath === 'auth/webauthn/register-finish') {
    if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

    // Mini-auth
    $wAuthHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$wAuthHeader && function_exists('apache_request_headers')) {
        $ah = apache_request_headers();
        $wAuthHeader = $ah['Authorization'] ?? $ah['authorization'] ?? '';
    }
    if (!$wAuthHeader || !str_starts_with($wAuthHeader, 'Bearer ')) jsonResponse(['error' => 'Unauthorized'], 401);
    $wToken = trim(substr($wAuthHeader, 7));
    if (str_starts_with($wToken, 'demo-')) jsonResponse(['error' => 'Biometric login is not available for guest accounts'], 403);
    $nowMs = round(microtime(true) * 1000);
    $wStmt = $pdo->prepare('SELECT * FROM sessions WHERE `token` = ? AND `expiresAt` > ?');
    $wStmt->execute([$wToken, $nowMs]);
    $wSession = $wStmt->fetch();
    if (!$wSession) jsonResponse(['error' => 'Unauthorized'], 401);

    $credentialId    = $body['credentialId'] ?? '';
    $clientDataJSON  = b64url_decode($body['clientDataJSON'] ?? '');
    $attestationObj  = b64url_decode($body['attestationObject'] ?? '');
    $deviceName      = trim($body['deviceName'] ?? 'My Device');

    if (!$credentialId || !$clientDataJSON || !$attestationObj) {
        jsonResponse(['error' => 'Missing credential data'], 400);
    }

    // Verify clientData
    $clientData = json_decode($clientDataJSON, true);
    if (!$clientData || $clientData['type'] !== 'webauthn.create') {
        jsonResponse(['error' => 'Invalid clientData type'], 400);
    }

    // Verify challenge
    $receivedChallenge = $clientData['challenge'] ?? '';
    $stmt = $pdo->prepare('SELECT * FROM webauthn_challenges WHERE `challenge` = ? AND `userId` = ? AND `expiresAt` > NOW()');
    $stmt->execute([$receivedChallenge, $wSession['userId']]);
    $ch = $stmt->fetch();
    if (!$ch) jsonResponse(['error' => 'Invalid or expired challenge'], 400);
    $pdo->prepare('DELETE FROM webauthn_challenges WHERE `id` = ?')->execute([$ch['id']]);

    // Parse attestationObject (CBOR map): fmt + attStmt + authData
    // We use a lightweight approach: skip fmt/attStmt, find authData
    // authData layout: rpIdHash(32) + flags(1) + counter(4) + aaguid(16) + credIdLen(2) + credId + coseKey
    $authDataStart = strpos($attestationObj, 'authData');
    if ($authDataStart === false) {
        // Try CBOR: find authData bytes directly (text key "authData" in CBOR is 68617574684461746100...)
        // Fallback: parse raw CBOR map for key "authData" (key 3 in packed fmt, but varies)
        // Simple approach: scan for 0x68617574684461 ("authData" as CBOR text)
        $needle = "\x68authData"; // CBOR text(8) + "authData"
        $authDataStart = strpos($attestationObj, $needle);
        if ($authDataStart !== false) {
            $authDataStart += strlen($needle);
            $bIb = ord($attestationObj[$authDataStart++]);
            $authDataLen = ($bIb & 0x1f) < 24 ? ($bIb & 0x1f) : ord($attestationObj[$authDataStart++]);
            $authData = substr($attestationObj, $authDataStart, $authDataLen);
            if (strlen($authData) < $authDataLen) {
                // byte string length stored in 2 bytes
                $authDataStart -= 1;
                $authDataLen = (ord($attestationObj[$authDataStart]) << 8) | ord($attestationObj[$authDataStart+1]);
                $authDataStart += 2;
                $authData = substr($attestationObj, $authDataStart, $authDataLen);
            }
        } else {
            jsonResponse(['error' => 'Could not parse attestation object'], 400);
        }
    } else {
        // For 'none' attestation (most platform authenticators), skip CBOR header bytes
        $authData = substr($attestationObj, $authDataStart + 10);
    }

    if (strlen($authData) < 55) jsonResponse(['error' => 'authData too short'], 400);

    $flags = ord($authData[32]);
    if (!($flags & 0x40)) jsonResponse(['error' => 'Attested credential data flag not set'], 400);

    $counter = unpack('N', substr($authData, 33, 4))[1];
    // aaguid: bytes 37-52, credIdLen: bytes 53-54
    $credIdLen = (ord($authData[53]) << 8) | ord($authData[54]);
    $coseKey = substr($authData, 55 + $credIdLen);

    $publicKeyPem = cose_key_to_pem($coseKey);
    if (!$publicKeyPem) jsonResponse(['error' => 'Unsupported key type (only ES256 / RS256 supported)'], 400);

    $stmt = $pdo->prepare('INSERT INTO webauthn_credentials (`userId`, `credentialId`, `publicKey`, `counter`, `deviceName`, `deviceAllowed`) VALUES (?, ?, ?, ?, ?, 1)');
    $stmt->execute([$wSession['userId'], $credentialId, $publicKeyPem, $counter, $deviceName]);

    jsonResponse(['success' => true, 'message' => 'Biometric credential registered successfully']);
}

// ── Route: /api/auth/webauthn/login-begin ────────────────────────────
// No auth required. Returns challenge + allowCredentials for login
if ($relPath === 'auth/webauthn/login-begin') {
    if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

    // Fetch all ALLOWED credentials (deviceAllowed = 1) for the admin user
    $stmt = $pdo->prepare('SELECT `credentialId` FROM webauthn_credentials WHERE `deviceAllowed` = 1');
    $stmt->execute();
    $creds = $stmt->fetchAll();

    if (empty($creds)) {
        jsonResponse(['error' => 'No registered biometric devices found. Please register a device in Settings first.'], 404);
    }

    $challenge = wa_generate_challenge();
    $expiresAt = date('Y-m-d H:i:s', time() + 300);
    $stmt = $pdo->prepare('INSERT INTO webauthn_challenges (`challenge`, `userId`, `expiresAt`) VALUES (?, NULL, ?)');
    $stmt->execute([$challenge, $expiresAt]);

    $allowCredentials = array_map(fn($c) => ['type' => 'public-key', 'id' => $c['credentialId']], $creds);

    jsonResponse([
        'challenge'        => $challenge,
        'rpId'             => $_SERVER['HTTP_HOST'] ?? 'localhost',
        'allowCredentials' => $allowCredentials,
        'userVerification' => 'required',
        'timeout'          => 60000,
    ]);
}

// ── Route: /api/auth/webauthn/login-verify ───────────────────────────
// No auth required. Verifies assertion, returns session token
if ($relPath === 'auth/webauthn/login-verify') {
    if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

    $credentialId   = $body['credentialId'] ?? '';
    $clientDataJSON = b64url_decode($body['clientDataJSON'] ?? '');
    $authDataB64    = $body['authenticatorData'] ?? '';
    $signatureB64   = $body['signature'] ?? '';

    if (!$credentialId || !$clientDataJSON || !$authDataB64 || !$signatureB64) {
        jsonResponse(['error' => 'Missing assertion data'], 400);
    }

    // Verify clientData
    $clientData = json_decode($clientDataJSON, true);
    if (!$clientData || $clientData['type'] !== 'webauthn.get') {
        jsonResponse(['error' => 'Invalid clientData type'], 400);
    }

    // Verify challenge
    $receivedChallenge = $clientData['challenge'] ?? '';
    $stmt = $pdo->prepare('SELECT * FROM webauthn_challenges WHERE `challenge` = ? AND `userId` IS NULL AND `expiresAt` > NOW()');
    $stmt->execute([$receivedChallenge]);
    $ch = $stmt->fetch();
    if (!$ch) jsonResponse(['error' => 'Invalid or expired challenge'], 400);
    $pdo->prepare('DELETE FROM webauthn_challenges WHERE `id` = ?')->execute([$ch['id']]);

    // Fetch credential (must be allowed)
    $stmt = $pdo->prepare('SELECT * FROM webauthn_credentials WHERE `credentialId` = ? AND `deviceAllowed` = 1');
    $stmt->execute([$credentialId]);
    $cred = $stmt->fetch();
    if (!$cred) jsonResponse(['error' => 'Device not found or not authorized. Contact admin to enable this device.'], 403);

    // Verify signature
    $authData     = b64url_decode($authDataB64);
    $signature    = b64url_decode($signatureB64);
    $clientDataHash = hash('sha256', $clientDataJSON, true);
    $verifyData   = $authData . $clientDataHash;

    $pubKey = openssl_pkey_get_public($cred['publicKey']);
    if (!$pubKey) jsonResponse(['error' => 'Failed to load public key'], 500);

    $keyDetails = openssl_pkey_get_details($pubKey);
    $algoConst  = ($keyDetails['type'] === OPENSSL_KEYTYPE_EC) ? OPENSSL_ALGO_SHA256 : OPENSSL_ALGO_SHA256;
    $verified   = openssl_verify($verifyData, $signature, $pubKey, $algoConst);

    if ($verified !== 1) jsonResponse(['error' => 'Biometric verification failed — signature mismatch'], 401);

    // Check counter (anti-clone)
    $counter = unpack('N', substr(b64url_decode($authDataB64), 33, 4))[1];
    if ($counter !== 0 && $counter <= $cred['counter']) {
        jsonResponse(['error' => 'Authenticator counter invalid — possible cloned credential'], 401);
    }
    $pdo->prepare('UPDATE webauthn_credentials SET `counter` = ? WHERE `id` = ?')->execute([$counter, $cred['id']]);

    // Issue session token for Main DB admin
    $token     = bin2hex(random_bytes(16));
    $expiresAt = (time() + 3600) * 1000;
    $stmt = $pdo->prepare('INSERT INTO sessions (`token`, `userId`, `expiresAt`) VALUES (?, ?, ?)');
    $stmt->execute([$token, $cred['userId'], $expiresAt]);

    jsonResponse(['success' => true, 'token' => $token, 'userId' => $cred['userId'], 'userType' => 'Administrator']);
}

// ── Route: /api/auth/webauthn/devices ────────────────────────────────
// Requires Bearer token — list / toggle / delete registered devices
if (str_starts_with($relPath, 'auth/webauthn/devices')) {
    // Mini-auth
    $wAuthHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$wAuthHeader && function_exists('apache_request_headers')) {
        $ah = apache_request_headers();
        $wAuthHeader = $ah['Authorization'] ?? $ah['authorization'] ?? '';
    }
    if (!$wAuthHeader || !str_starts_with($wAuthHeader, 'Bearer ')) jsonResponse(['error' => 'Unauthorized'], 401);
    $wToken = trim(substr($wAuthHeader, 7));
    if (str_starts_with($wToken, 'demo-')) jsonResponse(['error' => 'Not available for guest accounts'], 403);
    $nowMs = round(microtime(true) * 1000);
    $wStmt = $pdo->prepare('SELECT * FROM sessions WHERE `token` = ? AND `expiresAt` > ?');
    $wStmt->execute([$wToken, $nowMs]);
    $wSession = $wStmt->fetch();
    if (!$wSession) jsonResponse(['error' => 'Unauthorized'], 401);

    $devSegs = explode('/', $relPath); // ['auth','webauthn','devices'] or ['auth','webauthn','devices','123']
    $devId   = $devSegs[3] ?? null;

    if ($method === 'GET' && !$devId) {
        $stmt = $pdo->prepare('SELECT `id`, `credentialId`, `deviceName`, `deviceAllowed`, `createdAt` FROM webauthn_credentials WHERE `userId` = ? ORDER BY `createdAt` DESC');
        $stmt->execute([$wSession['userId']]);
        jsonResponse($stmt->fetchAll());
    }

    if ($method === 'PATCH' && $devId) {
        $allowed = isset($body['deviceAllowed']) ? (int)(bool)$body['deviceAllowed'] : null;
        $name    = isset($body['deviceName']) ? trim($body['deviceName']) : null;
        $updates = []; $params = [];
        if ($allowed !== null) { $updates[] = '`deviceAllowed` = ?'; $params[] = $allowed; }
        if ($name !== null)    { $updates[] = '`deviceName` = ?';    $params[] = $name; }
        if (empty($updates))   jsonResponse(['error' => 'Nothing to update'], 400);
        $params[] = $devId; $params[] = $wSession['userId'];
        $pdo->prepare('UPDATE webauthn_credentials SET ' . implode(', ', $updates) . ' WHERE `id` = ? AND `userId` = ?')->execute($params);
        jsonResponse(['success' => true]);
    }

    if ($method === 'DELETE' && $devId) {
        $pdo->prepare('DELETE FROM webauthn_credentials WHERE `id` = ? AND `userId` = ?')->execute([$devId, $wSession['userId']]);
        jsonResponse(['success' => true]);
    }

    jsonResponse(['error' => 'Method not allowed'], 405);
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
