<?php
// settings.php - Store and System Configuration
$pageTitle = 'Settings';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

$message = '';
$messageType = 'success';

// Ensure settings table exists
$pdo->exec("
    CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_name VARCHAR(255) DEFAULT 'TechStore POS',
        address TEXT,
        phone VARCHAR(255) DEFAULT '0917 123 4567',
        email VARCHAR(255) DEFAULT 'support@techstore.com',
        currency_symbol VARCHAR(10) DEFAULT '₱',
        tax_rate DECIMAL(5,2) DEFAULT 12.00,
        tax_inclusive TINYINT(1) DEFAULT 1
    )
");

// Insert default row if table is empty
$count = $pdo->query("SELECT COUNT(*) FROM settings")->fetchColumn();
if ($count == 0) {
    $pdo->exec("
        INSERT INTO settings (id, store_name, address, phone, email, currency_symbol, tax_rate, tax_inclusive)
        VALUES (1, 'TechStore POS', '123 Tech Lane, Gadget City, 1000', '0917 123 4567', 'hello@techstore.com', '₱', 12.00, 1)
    ");
}

// Handle Form Submission POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $storeName = trim($_POST['store_name'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $currency = trim($_POST['currency_symbol'] ?? '₱');
    $taxRate = floatval($_POST['tax_rate'] ?? 12);
    $taxInclusive = isset($_POST['tax_inclusive']) ? 1 : 0;

    try {
        $stmt = $pdo->prepare("
            UPDATE settings 
            SET store_name = ?, address = ?, phone = ?, email = ?, currency_symbol = ?, tax_rate = ?, tax_inclusive = ? 
            WHERE id = 1
        ");
        $stmt->execute([$storeName, $address, $phone, $email, $currency, $taxRate, $taxInclusive]);
        $message = 'Settings updated successfully!';
    } catch (PDOException $e) {
        $message = 'Failed to update settings: ' . $e->getMessage();
        $messageType = 'error';
    }
}

// Fetch current settings
$settings = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch();
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Store Settings</h1>
        <p class="page-subtitle">Configure business profile, tax rates, and receipt information</p>
      </div>
    </div>

    <?php if (!empty($message)): ?>
      <div style="background: <?= $messageType === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)' ?>; color: <?= $messageType === 'success' ? 'var(--success)' : 'var(--danger)' ?>; border: 1px solid <?= $messageType === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' ?>; padding: 0.85rem 1.25rem; border-radius: 10px; margin-bottom: 1.5rem; font-size: 0.9rem;">
        <?= htmlspecialchars($message) ?>
      </div>
    <?php endif; ?>

    <div class="card" style="max-width: 700px;">
      <form method="POST" action="settings.php">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
          Business Information
        </h3>

        <div class="form-group">
          <label class="form-label">Store / Company Name</label>
          <input type="text" name="store_name" value="<?= htmlspecialchars($settings['store_name'] ?? '') ?>" required>
        </div>

        <div class="form-group">
          <label class="form-label">Store Address</label>
          <textarea name="address" rows="2"><?= htmlspecialchars($settings['address'] ?? '') ?></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Contact Phone</label>
            <input type="text" name="phone" value="<?= htmlspecialchars($settings['phone'] ?? '') ?>">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" name="email" value="<?= htmlspecialchars($settings['email'] ?? '') ?>">
          </div>
        </div>

        <h3 style="font-size: 1.15rem; font-weight: 700; margin: 1.5rem 0 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
          Tax & Currency
        </h3>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Currency Symbol</label>
            <input type="text" name="currency_symbol" value="<?= htmlspecialchars($settings['currency_symbol'] ?? '₱') ?>" required>
          </div>
          <div class="form-group">
            <label class="form-label">VAT / Tax Rate (%)</label>
            <input type="number" name="tax_rate" step="0.01" min="0" value="<?= htmlspecialchars($settings['tax_rate'] ?? '12') ?>" required>
          </div>
        </div>

        <div class="form-group" style="margin-top: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox" name="tax_inclusive" value="1" <?= (!empty($settings['tax_inclusive'])) ? 'checked' : '' ?> style="width: auto;">
            <span>Prices shown are tax-inclusive</span>
          </label>
        </div>

        <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary">
            <i data-lucide="save" style="width: 16px; height: 16px;"></i> Save Settings
          </button>
        </div>
      </form>
    </div>

  </div>
</main>

<?php require_once 'includes/footer.php'; ?>
