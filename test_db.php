<?php
require __DIR__ . '/config/db.php';
echo "SUCCESS: Connected to " . $pdo->query("SELECT DATABASE()")->fetchColumn() . PHP_EOL;
