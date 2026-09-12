<?php
// reports.php - Sales Analytics and Reports
$pageTitle = 'Reports & Analytics';
$includeChartJs = true;

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

$startDate = $_GET['start_date'] ?? date('Y-m-01'); // 1st of current month
$endDate = $_GET['end_date'] ?? date('Y-m-d');

// Summary within date range
$stmtSummary = $pdo->prepare("
    SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(SUM(total), 0) as grand_total
    FROM sales
    WHERE DATE(sale_date) BETWEEN ? AND ?
");
$stmtSummary->execute([$startDate, $endDate]);
$summary = $stmtSummary->fetch();

// Sales breakdown by payment method
$stmtPayment = $pdo->prepare("
    SELECT payment_method, COUNT(id) as tx_count, SUM(total) as method_total 
    FROM sales 
    WHERE DATE(sale_date) BETWEEN ? AND ? 
    GROUP BY payment_method
");
$stmtPayment->execute([$startDate, $endDate]);
$paymentBreakdown = $stmtPayment->fetchAll();

// Product sales ranking
$stmtProdRank = $pdo->prepare("
    SELECT p.name, c.name as category_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_rev 
    FROM sale_items si 
    JOIN sales s ON si.sale_id = s.id 
    JOIN products p ON si.product_id = p.id 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE DATE(s.sale_date) BETWEEN ? AND ? 
    GROUP BY p.id, p.name, c.name 
    ORDER BY total_rev DESC
");
$stmtProdRank->execute([$startDate, $endDate]);
$productRankings = $stmtProdRank->fetchAll();
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Analytics & Reports</h1>
        <p class="page-subtitle">Generate performance summaries and revenue breakdown</p>
      </div>
      <div>
        <button type="button" class="btn btn-secondary" onclick="window.print()">
          <i data-lucide="printer" style="width: 16px; height: 16px;"></i> Print Report
        </button>
      </div>
    </div>

    <!-- Date Range Filter -->
    <div class="card" style="padding: 1rem 1.25rem;">
      <form method="GET" action="reports.php" style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 180px;">
          <label class="form-label">Start Date</label>
          <input type="date" name="start_date" value="<?= htmlspecialchars($startDate) ?>" required>
        </div>
        <div style="flex: 1; min-width: 180px;">
          <label class="form-label">End Date</label>
          <input type="date" name="end_date" value="<?= htmlspecialchars($endDate) ?>" required>
        </div>
        <div>
          <button type="submit" class="btn btn-primary" style="height: 42px;">
            <i data-lucide="filter" style="width: 16px; height: 16px;"></i> Filter Report
          </button>
        </div>
      </form>
    </div>

    <!-- Summary Metrics -->
    <div class="grid-4" style="margin-bottom: 1.75rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span>Completed Orders</span>
          <h3><?= $summary['total_orders'] ?></h3>
        </div>
        <div class="stat-icon" style="background: rgba(124, 92, 252, 0.15); color: var(--primary);">
          <i data-lucide="shopping-bag" style="width: 24px; height: 24px;"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span>Subtotal</span>
          <h3>₱<?= number_format($summary['total_subtotal'], 2) ?></h3>
        </div>
        <div class="stat-icon" style="background: var(--surface-color-light); color: var(--text-primary);">
          <i data-lucide="calculator" style="width: 24px; height: 24px;"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span>Total Tax (VAT)</span>
          <h3>₱<?= number_format($summary['total_tax'], 2) ?></h3>
        </div>
        <div class="stat-icon" style="background: var(--warning-bg); color: var(--warning);">
          <i data-lucide="receipt" style="width: 24px; height: 24px;"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span>Gross Revenue</span>
          <h3 style="color: var(--success);">₱<?= number_format($summary['grand_total'], 2) ?></h3>
        </div>
        <div class="stat-icon" style="background: var(--success-bg); color: var(--success);">
          <i data-lucide="dollar-sign" style="width: 24px; height: 24px;"></i>
        </div>
      </div>
    </div>

    <!-- Payment Breakdown & Products Performance -->
    <div class="grid-3" style="margin-bottom: 1.75rem;">
      <!-- Payment Methods -->
      <div class="card">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Payment Channels</h3>
        <?php if (empty($paymentBreakdown)): ?>
          <p style="color: var(--text-secondary);">No sales in this date range.</p>
        <?php else: ?>
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <?php foreach ($paymentBreakdown as $pay): ?>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border);">
                <div>
                  <strong><?= htmlspecialchars($pay['payment_method']) ?></strong>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);"><?= $pay['tx_count'] ?> orders</div>
                </div>
                <strong style="color: var(--primary);">₱<?= number_format($pay['method_total'], 2) ?></strong>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </div>

      <!-- Top Selling Items Table -->
      <div class="card" style="grid-column: span 2;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Product Sales Performance</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Units Sold</th>
                <th>Revenue Generated</th>
              </tr>
            </thead>
            <tbody>
              <?php if (empty($productRankings)): ?>
                <tr>
                  <td colspan="4" style="text-align: center; color: var(--text-secondary);">No products sold in this date range.</td>
                </tr>
              <?php else: ?>
                <?php foreach ($productRankings as $pr): ?>
                  <tr>
                    <td><strong><?= htmlspecialchars($pr['name']) ?></strong></td>
                    <td><?= htmlspecialchars($pr['category_name'] ?? 'General') ?></td>
                    <td><span class="badge badge-info"><?= $pr['total_qty'] ?> units</span></td>
                    <td><strong>₱<?= number_format($pr['total_rev'], 2) ?></strong></td>
                  </tr>
                <?php endforeach; ?>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</main>

<?php require_once 'includes/footer.php'; ?>
