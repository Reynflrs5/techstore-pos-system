<?php
// inventory.php - Stock In/Out and Inventory Movement
$pageTitle = 'Inventory Management';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

$message = '';
$messageType = 'success';

// Handle Stock Adjustment POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'adjust') {
    $product_id = intval($_POST['product_id'] ?? 0);
    $type = $_POST['transaction_type'] === 'STOCK_IN' ? 'STOCK_IN' : 'STOCK_OUT';
    $qty = intval($_POST['quantity'] ?? 0);
    $remarks = trim($_POST['remarks'] ?? 'Manual adjustment');
    $userId = $_SESSION['user']['id'] ?? null;

    if ($product_id <= 0 || $qty <= 0) {
        $message = 'Please select a product and enter a valid quantity.';
        $messageType = 'error';
    } else {
        $pdo->beginTransaction();
        try {
            // Update product stock
            if ($type === 'STOCK_IN') {
                $stmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
            } else {
                $stmt = $pdo->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?");
            }
            $stmt->execute([$qty, $product_id]);

            // Log entry
            $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (product_id, user_id, transaction_type, quantity, remarks) VALUES (?, ?, ?, ?, ?)");
            $stmtLog->execute([$product_id, $userId, $type, $qty, $remarks]);

            $pdo->commit();
            $message = 'Stock adjusted successfully!';
        } catch (Exception $e) {
            $pdo->rollBack();
            $message = 'Failed to adjust stock: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

// Fetch Inventory Logs
$stmt = $pdo->query("
    SELECT i.*, p.name as product_name, u.full_name as user_name 
    FROM inventory_logs i 
    LEFT JOIN products p ON i.product_id = p.id 
    LEFT JOIN users u ON i.user_id = u.id 
    ORDER BY i.created_at DESC 
    LIMIT 100
");
$logs = $stmt->fetchAll();

// Fetch products for adjustment dropdown
$products = $pdo->query("SELECT id, name, stock_quantity FROM products WHERE (is_archived = 0 OR is_archived IS NULL) ORDER BY name ASC")->fetchAll();
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventory Logs & Stock In/Out</h1>
        <p class="page-subtitle">Track stock movements, restocking, and automated sales deductions</p>
      </div>
      <div>
        <button type="button" class="btn btn-primary" onclick="openModal('stockAdjustModal')">
          <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i>
          Adjust Stock (In / Out)
        </button>
      </div>
    </div>

    <?php if (!empty($message)): ?>
      <div style="background: <?= $messageType === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)' ?>; color: <?= $messageType === 'success' ? 'var(--success)' : 'var(--danger)' ?>; border: 1px solid <?= $messageType === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' ?>; padding: 0.85rem 1.25rem; border-radius: 10px; margin-bottom: 1.5rem; font-size: 0.9rem;">
        <?= htmlspecialchars($message) ?>
      </div>
    <?php endif; ?>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Product</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Remarks</th>
            <th>Processed By</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($logs)): ?>
            <tr>
              <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                No inventory logs recorded yet.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($logs as $log): 
              $isIn = $log['transaction_type'] === 'STOCK_IN';
            ?>
              <tr>
                <td><?= htmlspecialchars($log['created_at']) ?></td>
                <td><strong><?= htmlspecialchars($log['product_name'] ?? 'Unknown Item') ?></strong></td>
                <td>
                  <span class="badge <?= $isIn ? 'badge-success' : 'badge-danger' ?>">
                    <i data-lucide="<?= $isIn ? 'arrow-down-left' : 'arrow-up-right' ?>" style="width: 12px; height: 12px;"></i>
                    <?= $log['transaction_type'] ?>
                  </span>
                </td>
                <td>
                  <strong style="color: <?= $isIn ? 'var(--success)' : 'var(--danger)' ?>;">
                    <?= $isIn ? '+' : '-' ?><?= $log['quantity'] ?>
                  </strong>
                </td>
                <td><?= htmlspecialchars($log['remarks'] ?? '-') ?></td>
                <td><?= htmlspecialchars($log['user_name'] ?? 'System') ?></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

  </div>
</main>

<!-- Modal: Adjust Stock -->
<div class="modal-overlay" id="stockAdjustModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Manual Stock Adjustment</h3>
      <button type="button" class="btn-icon" onclick="closeModal('stockAdjustModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="inventory.php">
      <input type="hidden" name="action" value="adjust">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Select Product *</label>
          <select name="product_id" required>
            <option value="">-- Choose Product --</option>
            <?php foreach ($products as $pr): ?>
              <option value="<?= $pr['id'] ?>"><?= htmlspecialchars($pr['name']) ?> (Current: <?= $pr['stock_quantity'] ?>)</option>
            <?php endforeach; ?>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Action Type *</label>
            <select name="transaction_type" required>
              <option value="STOCK_IN">Stock In (+ Add)</option>
              <option value="STOCK_OUT">Stock Out (- Deduct)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Quantity *</label>
            <input type="number" name="quantity" min="1" required placeholder="1">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Reason / Remarks</label>
          <input type="text" name="remarks" placeholder="e.g. Supplier delivery, Damaged unit, Audit correction">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('stockAdjustModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Apply Adjustment</button>
      </div>
    </form>
  </div>
</div>

<?php require_once 'includes/footer.php'; ?>
