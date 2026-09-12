<?php
// customers.php - Customer Relationship Management
$pageTitle = 'Customers';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

$message = '';
$messageType = 'success';

// Handle Add Customer POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
    $full_name = trim($_POST['full_name'] ?? '');
    $contact = trim($_POST['contact_number'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $address = trim($_POST['address'] ?? '');

    if (empty($full_name)) {
        $message = 'Customer full name is required.';
        $messageType = 'error';
    } else {
        try {
            $stmt = $pdo->prepare("INSERT INTO customers (full_name, contact_number, email, address) VALUES (?, ?, ?, ?)");
            $stmt->execute([$full_name, $contact, $email, $address]);
            $message = 'Customer added successfully!';
        } catch (PDOException $e) {
            $message = 'Error: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

// Handle Edit Customer POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'edit') {
    $id = intval($_POST['id'] ?? 0);
    $full_name = trim($_POST['full_name'] ?? '');
    $contact = trim($_POST['contact_number'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $address = trim($_POST['address'] ?? '');

    try {
        $stmt = $pdo->prepare("UPDATE customers SET full_name = ?, contact_number = ?, email = ?, address = ? WHERE id = ?");
        $stmt->execute([$full_name, $contact, $email, $address, $id]);
        $message = 'Customer updated successfully!';
    } catch (PDOException $e) {
        $message = 'Error: ' . $e->getMessage();
        $messageType = 'error';
    }
}

// Handle Delete Customer GET
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    try {
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        $message = 'Customer deleted successfully!';
    } catch (PDOException $e) {
        $message = 'Cannot delete customer with past sales history.';
        $messageType = 'error';
    }
}

// Fetch all customers
$customers = $pdo->query("SELECT * FROM customers ORDER BY full_name ASC")->fetchAll();
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Customer Directory</h1>
        <p class="page-subtitle">Manage customer records and contact details</p>
      </div>
      <div>
        <button type="button" class="btn btn-primary" onclick="openModal('addCustomerModal')">
          <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i>
          Add New Customer
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
            <th>Name</th>
            <th>Contact #</th>
            <th>Email</th>
            <th>Address</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($customers)): ?>
            <tr>
              <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                No customer profiles created yet.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($customers as $c): ?>
              <tr>
                <td><strong><?= htmlspecialchars($c['full_name']) ?></strong></td>
                <td><?= htmlspecialchars($c['contact_number'] ?? '-') ?></td>
                <td><?= htmlspecialchars($c['email'] ?? '-') ?></td>
                <td><?= htmlspecialchars($c['address'] ?? '-') ?></td>
                <td style="text-align: right;">
                  <button type="button" class="btn-icon" title="Edit" onclick='openEditModal(<?= json_encode($c) ?>)'>
                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                  </button>
                  <a href="customers.php?delete=<?= $c['id'] ?>" class="btn-icon" title="Delete" style="color: var(--danger);" onclick="return confirm('Are you sure you want to delete this customer?');">
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

<!-- Modal: Add Customer -->
<div class="modal-overlay" id="addCustomerModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Add Customer</h3>
      <button type="button" class="btn-icon" onclick="closeModal('addCustomerModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="customers.php">
      <input type="hidden" name="action" value="add">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" name="full_name" required placeholder="e.g. Juan Dela Cruz">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Contact Number</label>
            <input type="text" name="contact_number" placeholder="e.g. 0917-123-4567">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" name="email" placeholder="juan@example.com">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea name="address" rows="2" placeholder="Full address details..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('addCustomerModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Customer</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Edit Customer -->
<div class="modal-overlay" id="editCustomerModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Edit Customer</h3>
      <button type="button" class="btn-icon" onclick="closeModal('editCustomerModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <form method="POST" action="customers.php">
      <input type="hidden" name="action" value="edit">
      <input type="hidden" name="id" id="edit_cust_id">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" name="full_name" id="edit_cust_name" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Contact Number</label>
            <input type="text" name="contact_number" id="edit_cust_contact">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" name="email" id="edit_cust_email">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea name="address" id="edit_cust_address" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('editCustomerModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Customer</button>
      </div>
    </form>
  </div>
</div>

<script>
  function openEditModal(c) {
    document.getElementById('edit_cust_id').value = c.id;
    document.getElementById('edit_cust_name').value = c.full_name;
    document.getElementById('edit_cust_contact').value = c.contact_number || '';
    document.getElementById('edit_cust_email').value = c.email || '';
    document.getElementById('edit_cust_address').value = c.address || '';
    openModal('editCustomerModal');
  }
</script>

<?php require_once 'includes/footer.php'; ?>
