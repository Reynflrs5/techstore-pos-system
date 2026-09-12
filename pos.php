<?php
// pos.php - Point of Sale Terminal
$pageTitle = 'Point of Sale';
$extraCss = 'assets/css/pos.css';
$extraJs = 'assets/js/pos.js';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

// Fetch Categories
$stmtCat = $pdo->query("SELECT * FROM categories ORDER BY name ASC");
$categories = $stmtCat->fetchAll();

// Fetch Active Products
try {
    $stmtProd = $pdo->query("
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE (p.is_archived = 0 OR p.is_archived IS NULL)
        ORDER BY p.name ASC
    ");
    $products = $stmtProd->fetchAll();
} catch (PDOException $e) {
    // If is_archived column doesn't exist yet in MySQL table
    $stmtProd = $pdo->query("
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.name ASC
    ");
    $products = $stmtProd->fetchAll();
}

// Fetch Customers for optional customer tagging
$stmtCust = $pdo->query("SELECT id, full_name FROM customers ORDER BY full_name ASC");
$customers = $stmtCust->fetchAll();
?>

<div class="pos-wrapper">
  <!-- Left Side: Product Catalog -->
  <div class="pos-catalog">
    <div class="pos-topbar">
      <div class="pos-search">
        <i data-lucide="search" class="search-icon" style="width: 18px; height: 18px;"></i>
        <input type="text" id="posSearchInput" placeholder="Search products by name or scan barcode..." autocomplete="off">
      </div>
      <button type="button" class="btn btn-secondary" onclick="location.reload()" title="Refresh Catalog">
        <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i>
      </button>
    </div>

    <!-- Category Filter Pills -->
    <div class="category-pills">
      <button type="button" class="cat-pill active" data-cat="all">All Items</button>
      <?php foreach ($categories as $cat): ?>
        <button type="button" class="cat-pill" data-cat="<?= htmlspecialchars($cat['name']) ?>">
          <?= htmlspecialchars($cat['name']) ?>
        </button>
      <?php endforeach; ?>
    </div>

    <!-- Products Grid -->
    <div class="pos-grid">
      <?php if (empty($products)): ?>
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
          <i data-lucide="package-open" style="width: 48px; height: 48px; margin-bottom: 0.5rem; opacity: 0.5;"></i>
          <p>No products found. Add items in <a href="products.php" style="color: var(--primary);">Products</a> menu.</p>
        </div>
      <?php else: ?>
        <?php foreach ($products as $p): 
          $isOutOfStock = intval($p['stock_quantity']) <= 0;
          $isLowStock = intval($p['stock_quantity']) > 0 && intval($p['stock_quantity']) <= 5;
        ?>
          <div class="pos-card <?= $isOutOfStock ? 'out-of-stock' : '' ?>"
               data-id="<?= $p['id'] ?>"
               data-name="<?= htmlspecialchars($p['name']) ?>"
               data-barcode="<?= htmlspecialchars($p['barcode'] ?? '') ?>"
               data-category="<?= htmlspecialchars($p['category_name'] ?? 'General') ?>"
               data-stock="<?= $p['stock_quantity'] ?>"
               onclick="addToCart(<?= $p['id'] ?>, '<?= addslashes($p['name']) ?>', <?= $p['price'] ?>, <?= $p['stock_quantity'] ?>, '<?= addslashes($p['image_url'] ?? '') ?>')">
            
            <?php if (!empty($p['image_url'])): ?>
              <img src="<?= htmlspecialchars($p['image_url']) ?>" class="pos-card-img" alt="<?= htmlspecialchars($p['name']) ?>" onerror="this.src='';this.className='pos-card-img';this.innerHTML='<i data-lucide=image></i>';">
            <?php else: ?>
              <div class="pos-card-img">
                <i data-lucide="package" style="width: 32px; height: 32px; opacity: 0.4;"></i>
              </div>
            <?php endif; ?>

            <span class="pos-card-category"><?= htmlspecialchars($p['category_name'] ?? 'General') ?></span>
            <h4 class="pos-card-title"><?= htmlspecialchars($p['name']) ?></h4>

            <div class="pos-card-footer">
              <span class="pos-card-price">₱<?= number_format($p['price'], 2) ?></span>
              <span class="pos-card-stock <?= $isOutOfStock ? 'zero' : ($isLowStock ? 'low' : '') ?>">
                <?= $isOutOfStock ? 'Out of Stock' : $p['stock_quantity'] . ' in stock' ?>
              </span>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  </div>

  <!-- Right Side: Order Cart Panel -->
  <div class="pos-cart">
    <div class="cart-header">
      <h3>
        <i data-lucide="shopping-cart" style="width: 18px; height: 18px; color: var(--primary);"></i>
        Current Order
      </h3>
      <button type="button" class="btn btn-secondary btn-sm" onclick="clearCart()" title="Clear cart">
        <i data-lucide="trash" style="width: 14px; height: 14px;"></i> Clear
      </button>
    </div>

    <!-- Cart Items Scroll Area -->
    <div class="cart-items" id="cartItemsContainer">
      <!-- Injected via JavaScript -->
    </div>

    <div id="cartEmptyView" class="cart-empty" style="display: flex;">
      <i data-lucide="shopping-bag" style="width: 48px; height: 48px; opacity: 0.3;"></i>
      <p>Cart is currently empty.<br>Click any product on the left to add.</p>
    </div>

    <!-- Calculations Summary -->
    <div class="cart-summary">
      <div class="summary-row">
        <span>Subtotal</span>
        <span id="cartSubtotal">₱0.00</span>
      </div>
      <div class="summary-row">
        <span>VAT (12%)</span>
        <span id="cartTax">₱0.00</span>
      </div>
      <div class="summary-row total-row">
        <span>Total Due</span>
        <span class="total-amount" id="cartTotal">₱0.00</span>
      </div>
    </div>

    <!-- Checkout Action Button -->
    <div class="cart-actions">
      <button type="button" id="btnCheckout" class="btn btn-primary btn-checkout" onclick="openCheckoutModal()" disabled>
        <i data-lucide="credit-card" style="width: 18px; height: 18px;"></i>
        Pay / Checkout
      </button>
    </div>
  </div>
</div>

<!-- Modal: Checkout Payment -->
<div class="modal-overlay" id="checkoutModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Complete Transaction</h3>
      <button type="button" class="btn-icon" onclick="closeModal('checkoutModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <div class="modal-body">
      <div style="text-align: center; margin-bottom: 1.5rem; background: var(--surface-color-light); padding: 1rem; border-radius: 12px; border: 1px solid var(--border);">
        <span style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Total Amount Due</span>
        <h2 style="font-size: 2rem; color: var(--primary); margin: 0.25rem 0;" id="checkoutTotalDisplay">₱0.00</h2>
      </div>

      <div class="form-group">
        <label class="form-label">Customer (Optional)</label>
        <select id="customerSelect">
          <option value="">Walk-in Customer</option>
          <?php foreach ($customers as $c): ?>
            <option value="<?= $c['id'] ?>"><?= htmlspecialchars($c['full_name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <select id="paymentMethodSelect">
          <option value="Cash" selected>Cash</option>
          <option value="GCash">GCash / Maya</option>
          <option value="Card">Debit / Credit Card</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Amount Tendered / Paid (₱)</label>
        <input type="number" id="amountPaidInput" step="0.01" min="0" oninput="updateChangeAmount()">
      </div>

      <!-- Quick Cash Buttons -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="setQuickCash('exact')">Exact</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setQuickCash(100)">₱100</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setQuickCash(500)">₱500</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setQuickCash(1000)">₱1,000</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="setQuickCash(2000)">₱2,000</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-color-light); padding: 0.85rem 1rem; border-radius: 9px; border: 1px solid var(--border);">
        <span style="font-weight: 600;">Change:</span>
        <span style="font-size: 1.25rem; font-weight: 700; color: var(--success);" id="changeDisplay">₱0.00</span>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeModal('checkoutModal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btnConfirmPayment" onclick="submitPayment()">
        Complete Order
      </button>
    </div>
  </div>
</div>

<!-- Modal: Printable Receipt -->
<div class="modal-overlay" id="receiptModal">
  <div class="modal-content" style="max-width: 400px;">
    <div class="modal-header">
      <h3 class="modal-title">Sales Receipt</h3>
      <button type="button" class="btn-icon" onclick="closeModal('receiptModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <div class="modal-body" id="receiptContent">
      <!-- Populated via pos.js -->
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeModal('receiptModal')">Close</button>
      <button type="button" class="btn btn-primary" onclick="printReceipt()">
        <i data-lucide="printer" style="width: 16px; height: 16px;"></i> Print Receipt
      </button>
    </div>
  </div>
</div>

<?php require_once 'includes/footer.php'; ?>
