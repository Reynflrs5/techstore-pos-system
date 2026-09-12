<?php
// includes/sidebar.php
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<aside class="sidebar">
  <div class="sidebar-header">
    <div class="logo-mark">
      <i data-lucide="cpu" style="width: 20px; height: 20px;"></i>
    </div>
    <div class="brand-block">
      <h2>TechStore</h2>
      <span>POS Terminal</span>
    </div>
  </div>

  <nav class="sidebar-nav">
    <?php if ($userRole === 'admin'): ?>
      <div class="nav-group">
        <div class="nav-group-label">Overview</div>
        <a href="dashboard.php" class="nav-item <?= $currentPage === 'dashboard.php' ? 'active' : '' ?>">
          <i data-lucide="layout-dashboard" style="width: 18px; height: 18px;"></i>
          <span>Dashboard</span>
        </a>
        <a href="pos.php" class="nav-item <?= $currentPage === 'pos.php' ? 'active' : '' ?>">
          <i data-lucide="monitor" style="width: 18px; height: 18px;"></i>
          <span>Point of Sale</span>
        </a>
      </div>

      <div class="nav-group">
        <div class="nav-group-label">Catalog</div>
        <a href="products.php" class="nav-item <?= $currentPage === 'products.php' ? 'active' : '' ?>">
          <i data-lucide="package" style="width: 18px; height: 18px;"></i>
          <span>Products</span>
        </a>
        <a href="categories.php" class="nav-item <?= $currentPage === 'categories.php' ? 'active' : '' ?>">
          <i data-lucide="tags" style="width: 18px; height: 18px;"></i>
          <span>Categories</span>
        </a>
        <a href="inventory.php" class="nav-item <?= $currentPage === 'inventory.php' ? 'active' : '' ?>">
          <i data-lucide="box" style="width: 18px; height: 18px;"></i>
          <span>Inventory Logs</span>
        </a>
      </div>

      <div class="nav-group">
        <div class="nav-group-label">Relationships</div>
        <a href="customers.php" class="nav-item <?= $currentPage === 'customers.php' ? 'active' : '' ?>">
          <i data-lucide="users" style="width: 18px; height: 18px;"></i>
          <span>Customers</span>
        </a>
        <a href="sales.php" class="nav-item <?= $currentPage === 'sales.php' ? 'active' : '' ?>">
          <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
          <span>Sales Records</span>
        </a>
      </div>

      <div class="nav-group">
        <div class="nav-group-label">Insights & System</div>
        <a href="reports.php" class="nav-item <?= $currentPage === 'reports.php' ? 'active' : '' ?>">
          <i data-lucide="bar-chart-2" style="width: 18px; height: 18px;"></i>
          <span>Reports</span>
        </a>
        <a href="settings.php" class="nav-item <?= $currentPage === 'settings.php' ? 'active' : '' ?>">
          <i data-lucide="settings" style="width: 18px; height: 18px;"></i>
          <span>Settings</span>
        </a>
      </div>
    <?php else: ?>
      <!-- Cashier View -->
      <div class="nav-group">
        <div class="nav-group-label">Workspace</div>
        <a href="pos.php" class="nav-item <?= $currentPage === 'pos.php' ? 'active' : '' ?>">
          <i data-lucide="monitor" style="width: 18px; height: 18px;"></i>
          <span>Point of Sale</span>
        </a>
        <a href="customers.php" class="nav-item <?= $currentPage === 'customers.php' ? 'active' : '' ?>">
          <i data-lucide="users" style="width: 18px; height: 18px;"></i>
          <span>Customers</span>
        </a>
        <a href="sales.php" class="nav-item <?= $currentPage === 'sales.php' ? 'active' : '' ?>">
          <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
          <span>Sales History</span>
        </a>
      </div>
    <?php endif; ?>
  </nav>

  <div class="sidebar-footer">
    <div class="user-badge">
      <div class="user-avatar"><?= strtoupper(substr($userName, 0, 1)) ?></div>
      <div>
        <div class="user-name"><?= htmlspecialchars($userName) ?></div>
        <div class="user-role"><?= htmlspecialchars($userRole) ?></div>
      </div>
    </div>

    <button type="button" class="btn btn-secondary btn-sm" onclick="toggleTheme()" style="width: 100%; justify-content: flex-start;">
      <i data-lucide="sun-moon" style="width: 16px; height: 16px;"></i>
      <span>Toggle Theme</span>
    </button>

    <a href="logout.php" class="btn btn-danger btn-sm" style="width: 100%;">
      <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
      <span>Logout</span>
    </a>
  </div>
</aside>
