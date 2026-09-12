<?php
// categories.php - Category Management
$pageTitle = 'Categories';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

$message = '';
$messageType = 'success';

// Handle Add Category
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if (empty($name)) {
        $message = 'Category name is required.';
        $messageType = 'error';
    } else {
        try {
            $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
            $stmt->execute([$name, $description]);
            $message = 'Category added successfully!';
        } catch (PDOException $e) {
            $message = 'Error: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

// Handle Edit Category
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'edit') {
    $id = intval($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');

    try {
        $stmt = $pdo->prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?");
        $stmt->execute([$name, $description, $id]);
        $message = 'Category updated successfully!';
    } catch (PDOException $e) {
        $message = 'Error: ' . $e->getMessage();
        $messageType = 'error';
    }
}

// Handle Delete Category
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    try {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        $message = 'Category deleted successfully!';
    } catch (PDOException $e) {
        $message = 'Cannot delete category: products are assigned to it.';
        $messageType = 'error';
    }
}

// Fetch categories with product counts
$stmt = $pdo->query("
    SELECT c.*, COUNT(p.id) as product_count 
    FROM categories c 
    LEFT JOIN products p ON c.id = p.category_id 
    GROUP BY c.id 
    ORDER BY c.name ASC
");
$categories = $stmt->fetchAll();
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Category Management</h1>
        <p class="page-subtitle">Group and organize products for easy filtering in POS</p>
      </div>
      <div>
        <button type="button" class="btn btn-primary" onclick="openModal('addCategoryModal')">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          Add New Category
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
            <th>ID</th>
            <th>Category Name</th>
            <th>Description</th>
            <th>Total Products</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($categories)): ?>
            <tr>
              <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                No categories found. Click "Add New Category" to create one.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($categories as $cat): ?>
              <tr>
                <td>#<?= $cat['id'] ?></td>
                <td><strong><?= htmlspecialchars($cat['name']) ?></strong></td>
                <td><?= htmlspecialchars($cat['description'] ?? '-') ?></td>
                <td>
                  <span class="badge badge-info"><?= $cat['product_count'] ?> products</span>
                </td>
                <td style="text-align: right;">
                  <button type="button" class="btn-icon" title="Edit" onclick='openEditModal(<?= json_encode($cat) ?>)'>
                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                  </button>
                  <a href="categories.php?delete=<?= $cat['id'] ?>" class="btn-icon" title="Delete" style="color: var(--danger);" onclick="return confirm('Are you sure you want to delete this category?');">
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

<!-- Modal: Add Category -->
<div class="modal-overlay" id="addCategoryModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Add Category</h3>
      <button type="button" class="btn-icon" onclick="closeModal('addCategoryModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="categories.php">
      <input type="hidden" name="action" value="add">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Category Name *</label>
          <input type="text" name="name" required placeholder="e.g. Keyboards, Monitors, Laptops">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" rows="3" placeholder="Category description..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('addCategoryModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Category</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Category -->
<div class="modal-overlay" id="editCategoryModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Edit Category</h3>
      <button type="button" class="btn-icon" onclick="closeModal('editCategoryModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="categories.php">
      <input type="hidden" name="action" value="edit">
      <input type="hidden" name="id" id="edit_cat_id">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Category Name *</label>
          <input type="text" name="name" id="edit_cat_name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" id="edit_cat_description" rows="3"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('editCategoryModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Category</button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditModal(cat) {
    document.getElementById('edit_cat_id').value = cat.id;
    document.getElementById('edit_cat_name').value = cat.name;
    document.getElementById('edit_cat_description').value = cat.description || '';
    openModal('editCategoryModal');
  }
</script>

<?php require_once 'includes/footer.php'; ?>
