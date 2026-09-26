<?php
/**
 * Garment OS — Relational Database Core Gateway & PDO Transaction Manager
 * Supports MySQL, MariaDB, and SQLite (local/testing) with strict ACID transactions.
 */

class Database {
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $configFile = __DIR__ . '/config.php';
        $config = file_exists($configFile) ? require $configFile : [
            'host'     => getenv('DB_HOST') ?: 'localhost',
            'database' => getenv('DB_NAME') ?: 'u465023737_garment_os',
            'username' => getenv('DB_USER') ?: 'u465023737_garment_admin',
            'password' => getenv('DB_PASS') ?: 'Sai@51155',
            'charset'  => 'utf8mb4'
        ];

        // SQLite override if specified in environment (for testing/local execution)
        if (getenv('SQLITE_DB_PATH')) {
            $dsn = 'sqlite:' . getenv('SQLITE_DB_PATH');
            self::$pdo = new PDO($dsn, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            self::$pdo->exec("PRAGMA foreign_keys = ON;");
            return self::$pdo;
        }

        $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
        self::$pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);

        return self::$pdo;
    }

    public static function setConnection($pdo) {
        self::$pdo = $pdo;
    }

    public static function transaction(callable $callback) {
        $db = self::getConnection();
        $db->beginTransaction();
        try {
            $result = $callback($db);
            $db->commit();
            return $result;
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    public static function query(string $sql, array $params = []): array {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function queryOne(string $sql, array $params = []): ?array {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public static function execute(string $sql, array $params = []): int {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function generateUuid(string $prefix = ''): string {
        $uuid = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        return $prefix ? $prefix . '_' . substr($uuid, 0, 8) : $uuid;
    }
}
