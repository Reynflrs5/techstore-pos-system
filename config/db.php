<?php
// config/db.php - Database connection using PDO

// Load environment variables from .env if present
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../server/.env';
}

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
            putenv(sprintf('%s=%s', $name, $value));
        }
    }
}

$host = $_ENV['DB_HOST'] ?? '192.168.141.132';
$port = $_ENV['DB_PORT'] ?? 3306;
$db   = $_ENV['DB_NAME'] ?? 'techstorepos_db';
$user = $_ENV['DB_USER'] ?? 'admin';
$pass = $_ENV['DB_PASSWORD'] ?? 'admin1234';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_TIMEOUT            => 5,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    die("<h3>Database Connection Error</h3><p>" . htmlspecialchars($e->getMessage()) . "</p><p>Host: <code>$host:$port</code> | User: <code>$user</code> | Database: <code>$db</code></p>");
}
