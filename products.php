<?php
// products.php - Product Inventory Management
$pageTitle = 'Product Management';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

$message = '';
$messageType = 'success';

// Handle Add Product POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
    $name = trim($_POST['name'] ?? '');
    $barcode = trim($_POST['barcode'] ?? '');
    $category_id = !empty($_POST['category_id']) ? intval($_POST['category_id']) : null;
    $price = floatval($_POST['price'] ?? 0);
    $stock = intval($_POST['stock_quantity'] ?? 0);
    $image_url = trim($_POST['image_url'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if (empty($name) || empty($barcode)) {
        $message = 'Product name and barcode are required.';
        $messageType = 'error';
    } else {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO products (name, barcode, category_id, price, stock_quantity, image_url, description) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $barcode, $category_id, $price, $stock, $image_url, $description]);
            $productId = $pdo->lastInsertId();

            if ($stock > 0) {
                $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES (?, 'STOCK_IN', ?, 'Initial Stock')");
                $stmtLog->execute([$productId, $stock]);
            }

            $message = 'Product added successfully!';
        } catch (PDOException $e) {
            $message = 'Error: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

// Handle Edit Product POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'edit') {
    $id = intval($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $barcode = trim($_POST['barcode'] ?? '');
    $category_id = !empty($_POST['category_id']) ? intval($_POST['category_id']) : null;
    $price = floatval($_POST['price'] ?? 0);
    $newStock = intval($_POST['stock_quantity'] ?? 0);
    $image_url = trim($_POST['image_url'] ?? '');
    $description = trim($_POST['description'] ?? '');

    try {
        $oldStock = $pdo->query("SELECT stock_quantity FROM products WHERE id = $id")->fetchColumn() ?: 0;
        $diff = $newStock - $oldStock;

        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, barcode = ?, category_id = ?, price = ?, stock_quantity = ?, image_url = ?, description = ? 
            WHERE id = ?
        ");
        $stmt->execute([$name, $barcode, $category_id, $price, $newStock, $image_url, $description, $id]);

        if ($diff !== 0) {
            $type = $diff > 0 ? 'STOCK_IN' : 'STOCK_OUT';
            $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES (?, ?, ?, 'Manual Stock Adjustment')");
            $stmtLog->execute([$id, $type, abs($diff)]);
        }

        $message = 'Product updated successfully!';
    } catch (PDOException $e) {
        $message = 'Error: ' . $e->getMessage();
        $messageType = 'error';
    }
}

// Handle Delete Product GET
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    try {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $message = 'Product deleted successfully!';
    } catch (PDOException $e) {
        // If constrained by foreign key (sales), soft archive
        $stmt = $pdo->prepare("UPDATE products SET is_archived = 1 WHERE id = ?");
        $stmt->execute([$id]);
        $message = 'Product archived (cannot permanently delete sales history).';
    }
}

// Fetch categories for dropdown
$categories = $pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll();

// Search & filter
$search = trim($_GET['search'] ?? '');
$catFilter = trim($_GET['category'] ?? '');

$sql = "
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE (p.is_archived = 0 OR p.is_archived IS NULL)
";
$params = [];

if (!empty($search)) {
    $sql .= " AND (p.name LIKE ? OR p.barcode LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if (!empty($catFilter)) {
    $sql .= " AND p.category_id = ?";
    $params[] = $catFilter;
}

$sql .= " ORDER BY p.id DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Products Inventory</h1>
        <p class="page-subtitle">Manage store catalog, prices, and stock quantities</p>
      </div>
      <div>
        <button type="button" class="btn btn-primary" onclick="openAddModal()">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          Add New Product
        </button>
      </div>
    </div>

    <?php if (!empty($message)): ?>
      <div style="background: <?= $messageType === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)' ?>; color: <?= $messageType === 'success' ? 'var(--success)' : 'var(--danger)' ?>; border: 1px solid <?= $messageType === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' ?>; padding: 0.85rem 1.25rem; border-radius: 10px; margin-bottom: 1.5rem; font-size: 0.9rem;">
        <?= htmlspecialchars($message) ?>
      </div>
    <?php endif; ?>

    <!-- Search & Filter Bar -->
    <div class="card" style="padding: 1rem 1.25rem;">
      <form method="GET" action="products.php" style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <div style="flex: 2; min-width: 200px;">
          <input type="text" name="search" placeholder="Search by name or barcode..." value="<?= htmlspecialchars($search) ?>">
        </div>
        <div style="flex: 1; min-width: 160px;">
          <select name="category" onchange="this.form.submit()">
            <option value="">All Categories</option>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= $cat['id'] ?>" <?= $catFilter == $cat['id'] ? 'selected' : '' ?>>
                <?= htmlspecialchars($cat['name']) ?>
              </option>
            <?php endforeach; ?>
          </select>
        </div>
        <button type="submit" class="btn btn-secondary">
          <i data-lucide="search" style="width: 16px; height: 16px;"></i> Filter
        </button>
        <?php if (!empty($search) || !empty($catFilter)): ?>
          <a href="products.php" class="btn btn-secondary">Clear</a>
        <?php endif; ?>
      </form>
    </div>

    <!-- Products Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 60px;">Image</th>
            <th>Name</th>
            <th>Barcode</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($products)): ?>
            <tr>
              <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                No products found matching criteria.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($products as $p): 
              $isOut = intval($p['stock_quantity']) <= 0;
              $isLow = intval($p['stock_quantity']) > 0 && intval($p['stock_quantity']) <= 5;
            ?>
              <tr>
                <td>
                  <?php if (!empty($p['image_url'])): ?>
                    <img src="<?= htmlspecialchars($p['image_url']) ?>" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: var(--surface-color-light);">
                  <?php else: ?>
                    <div style="width: 44px; height: 44px; border-radius: 8px; background: var(--surface-color-light); display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                      <i data-lucide="package" style="width: 20px; height: 20px;"></i>
                    </div>
                  <?php endif; ?>
                </td>
                <td>
                  <strong><?= htmlspecialchars($p['name']) ?></strong>
                  <?php if (!empty($p['description'])): ?>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);"><?= htmlspecialchars(substr($p['description'], 0, 50)) ?>...</div>
                  <?php endif; ?>
                </td>
                <td><code><?= htmlspecialchars($p['barcode'] ?? '-') ?></code></td>
                <td><?= htmlspecialchars($p['category_name'] ?? 'Uncategorized') ?></td>
                <td><strong style="color: var(--primary);">₱<?= number_format($p['price'], 2) ?></strong></td>
                <td><strong><?= $p['stock_quantity'] ?></strong></td>
                <td>
                  <?php if ($isOut): ?>
                    <span class="badge badge-danger">Out of Stock</span>
                  <?php elseif ($isLow): ?>
                    <span class="badge badge-warning">Low Stock</span>
                  <?php else: ?>
                    <span class="badge badge-success">In Stock</span>
                  <?php endif; ?>
                </td>
                <td style="text-align: right;">
                  <button type="button" class="btn-icon" title="Edit" onclick='openEditModal(<?= json_encode($p) ?>)'>
                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                  </button>
                  <a href="products.php?delete=<?= $p['id'] ?>" class="btn-icon" title="Delete" style="color: var(--danger);" onclick="return confirm('Are you sure you want to delete this product?');">
                    <i data-lucide="trash" style="width: 16px; height: 16px;"></i>
                  </a>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

  </div>
</main>

<!-- Modal: Add Product -->
<div class="modal-overlay" id="addProductModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Add New Product</h3>
      <button type="button" class="btn-icon" onclick="closeModal('addProductModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="products.php">
      <input type="hidden" name="action" value="add">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" name="name" required placeholder="e.g. Logitech MX Master 3S">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Barcode / SKU *</label>
            <input type="text" name="barcode" required placeholder="e.g. 8934521098">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select name="category_id">
              <option value="">Select Category</option>
              <?php foreach ($categories as $cat): ?>
                <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Selling Price (₱) *</label>
            <input type="number" name="price" step="0.01" min="0" required placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label">Initial Stock *</label>
            <input type="number" name="stock_quantity" min="0" required value="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input type="url" name="image_url" placeholder="https://example.com/image.jpg">
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" rows="2" placeholder="Product details..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('addProductModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Product</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Product -->
<div class="modal-overlay" id="editProductModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Edit Product</h3>
      <button type="button" class="btn-icon" onclick="closeModal('editProductModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="products.php">
      <input type="hidden" name="action" value="edit">
      <input type="hidden" name="id" id="edit_id">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" name="name" id="edit_name" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Barcode / SKU *</label>
            <input type="text" name="barcode" id="edit_barcode" required>
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select name="category_id" id="edit_category_id">
              <option value="">Select Category</option>
              <?php foreach ($categories as $cat): ?>
                <option value="<?= $cat['id'] ?>"><?= htmlspecialchars($cat['name']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Selling Price (₱) *</label>
            <input type="number" name="price" id="edit_price" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">Stock Quantity *</label>
            <input type="number" name="stock_quantity" id="edit_stock" min="0" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input type="url" name="image_url" id="edit_image_url">
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" id="edit_description" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('editProductModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Product</button>
      </div>
    </form>
  </div>
</div>

<script>
  function openAddModal() {
    openModal('addProductModal');
  }

  function openEditModal(prod) {
    document.getElementById('edit_id').value = prod.id;
    document.getElementById('edit_name').value = prod.name;
    document.getElementById('edit_barcode').value = prod.barcode;
    document.getElementById('edit_category_id').value = prod.category_id || '';
    document.getElementById('edit_price').value = prod.price;
    document.getElementById('edit_stock').value = prod.stock_quantity;
    document.getElementById('edit_image_url').value = prod.image_url || '';
    document.getElementById('edit_description').value = prod.description || '';
    openModal('editProductModal');
  }
</script>

<?php require_once 'includes/footer.php'; ?>
