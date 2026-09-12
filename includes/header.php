<?php
// includes/header.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Redirect if not logged in
$currentScript = basename($_SERVER['PHP_SELF']);
if (!isset($_SESSION['user']) && $currentScript !== 'index.php') {
    header("Location: index.php");
    exit();
}

$currentUser = $_SESSION['user'] ?? null;
$userRole = $currentUser['role'] ?? 'cashier';
$userName = $currentUser['full_name'] ?? 'User';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= isset($pageTitle) ? htmlspecialchars($pageTitle) . ' - TechStore POS' : 'TechStore POS' ?></title>
  
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- CSS Stylesheets -->
  <link rel="stylesheet" href="assets/css/style.css">
  <?php if (isset($extraCss)): ?>
    <link rel="stylesheet" href="<?= htmlspecialchars($extraCss) ?>">
  <?php endif; ?>

  <!-- Lucide Icons CDN -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- Chart.js CDN (lightweight) -->
  <?php if (isset($includeChartJs) && $includeChartJs): ?>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <?php endif; ?>
</head>
<body>
<div class="app-container">
