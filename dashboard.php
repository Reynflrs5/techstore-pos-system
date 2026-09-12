<?php
// dashboard.php - Overview Metrics and Analytics
$pageTitle = 'Dashboard';
$includeChartJs = true;

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

// Stats Queries
$totalSales = $pdo->query("SELECT COALESCE(SUM(total), 0) FROM sales")->fetchColumn();
$todaySales = $pdo->query("SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(sale_date) = CURDATE()")->fetchColumn();
$totalProducts = $pdo->query("SELECT COUNT(*) FROM products WHERE (is_archived = 0 OR is_archived IS NULL)")->fetchColumn();
$lowStock = $pdo->query("SELECT COUNT(*) FROM products WHERE stock_quantity < 10 AND (is_archived = 0 OR is_archived IS NULL)")->fetchColumn();

// Recent 5 Sales
$stmtRecent = $pdo->query("
    SELECT s.id, s.receipt_number, s.total, s.payment_method, DATE_FORMAT(s.sale_date, '%h:%i %p') as time, s.sale_date 
    FROM sales s 
    ORDER BY s.sale_date DESC 
    LIMIT 5
");
$recentSales = $stmtRecent->fetchAll();

// Top 5 Best Sellers
$stmtBest = $pdo->query("
    SELECT p.name, SUM(si.quantity) as total_sold, p.stock_quantity 
    FROM sale_items si 
    JOIN products p ON p.id = si.product_id 
    GROUP BY p.id, p.name, p.stock_quantity 
    ORDER BY total_sold DESC 
    LIMIT 5
");
$bestSellers = $stmtBest->fetchAll();

// Last 7 days sales for Chart
$stmtWeekly = $pdo->query("
    SELECT DATE_FORMAT(sale_date, '%b %d') as day_label, SUM(total) as daily_total 
    FROM sales 
    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
    GROUP BY DATE(sale_date), DATE_FORMAT(sale_date, '%b %d')
    ORDER BY DATE(sale_date) ASC
");
$weeklyData = $stmtWeekly->fetchAll();

$chartLabels = [];
$chartValues = [];
foreach ($weeklyData as $row) {
    $chartLabels[] = $row['day_label'];
    $chartValues[] = (float)$row['daily_total'];
}
if (empty($chartLabels)) {
    $chartLabels = ['No Sales Yet'];
    $chartValues = [0];
}
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Store Dashboard</h1>
        <p class="page-subtitle">Real-time performance summary and sales overview</p>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <a href="pos.php" class="btn btn-primary">
          <i data-lucide="monitor" style="width: 16px; height: 16px;"></i>
          Open POS Terminal
        </a>
      </div>
    </div>

    <!-- 4 Metrics Cards -->
    <div class="grid-4" style="margin-bottom: 1.75rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span>Today's Sales</span>
          <h3>₱<?= number_format($todaySales, 2) ?></h3>
        </div>
        <div class="stat-icon" style="background: rgba(124, 92, 252, 0.15); color: var(--primary);">
          <i data-lucide="circle-dollar-sign" style="width: 24px; height: 24px;"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span>Total Revenue</span>
          <h3>₱<?= number_format($totalSales, 2) ?></h3>
        </div>
        <div class="stat-icon" style="background: var(--success-bg); color: var(--success);">
          <i data-lucide="trending-up" style="width: 24px; height: 24px;"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span>Total Products</span>
          <h3><?= $totalProducts ?></h3>
        </div>
        <div class="stat-icon" style="background: rgba(34, 211, 238, 0.15); color: var(--info);">
          <i data-lucide="package" style="width: 24px; height: 24px;"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span>Low Stock Alert</span>
          <h3 style="color: <?= $lowStock > 0 ? 'var(--danger)' : 'var(--text-primary)' ?>;"><?= $lowStock ?></h3>
        </div>
        <div class="stat-icon" style="background: var(--danger-bg); color: var(--danger);">
          <i data-lucide="alert-triangle" style="width: 24px; height: 24px;"></i>
        </div>
      </div>
    </div>

    <!-- Charts & Analytics -->
    <div class="grid-3" style="margin-bottom: 1.75rem;">
      <!-- Chart Column (2 cols wide) -->
      <div class="card" style="grid-column: span 2;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0;">Weekly Sales Trend</h3>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">Last 7 Days</span>
        </div>
        <div style="height: 260px; position: relative;">
          <canvas id="salesChart"></canvas>
        </div>
      </div>

      <!-- Top Best Sellers Column -->
      <div class="card">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Top Best Sellers</h3>
        <?php if (empty($bestSellers)): ?>
          <p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No sales data available yet.</p>
        <?php else: ?>
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <?php foreach ($bestSellers as $item): ?>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.6rem; border-bottom: 1px solid var(--border);">
                <div>
                  <div style="font-weight: 600; font-size: 0.875rem;"><?= htmlspecialchars($item['name']) ?></div>
                  <small style="color: var(--text-secondary);">Current Stock: <?= $item['stock_quantity'] ?></small>
                </div>
                <span class="badge badge-info"><?= $item['total_sold'] ?> sold</span>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>
    </div>

    <!-- Recent Transactions Table -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0;">Recent Transactions</h3>
        <a href="sales.php" style="font-size: 0.825rem; color: var(--primary); text-decoration: none; font-weight: 600;">View All Transactions &rarr;</a>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Date & Time</th>
              <th>Payment Method</th>
              <th>Total Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <?php if (empty($recentSales)): ?>
              <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary);">No transactions recorded yet.</td>
              </tr>
            <?php else: ?>
              <?php foreach ($recentSales as $sale): ?>
                <tr>
                  <td><strong><?= htmlspecialchars($sale['receipt_number']) ?></strong></td>
                  <td><?= htmlspecialchars($sale['sale_date']) ?></td>
                  <td><?= htmlspecialchars($sale['payment_method']) ?></td>
                  <td><strong style="color: var(--primary);">₱<?= number_format($sale['total'], 2) ?></strong></td>
                  <td><span class="badge badge-success">Completed</span></td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</main>

<script>
  // Initialize Chart.js
  const ctx = document.getElementById('salesChart');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: <?= json_encode($chartLabels) ?>,
        datasets: [{
          label: 'Sales (₱)',
          data: <?= json_encode($chartValues) ?>,
          borderColor: '#7c5cfc',
          backgroundColor: 'rgba(124, 92, 252, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#22d3ee',
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#7d8398' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#7d8398',
              callback: function(value) { return '₱' + value.toLocaleString(); }
            }
          }
        }
      }
    });
  }
</script>

<?php require_once 'includes/footer.php'; ?>
