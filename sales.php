<?php
// sales.php - Sales Transactions History
$pageTitle = 'Sales Records';

require_once 'config/db.php';
require_once 'includes/header.php';
require_once 'includes/sidebar.php';

// Fetch all sales with user full name and customer name
$stmt = $pdo->query("
    SELECT s.*, u.full_name as cashier_name, c.full_name as customer_name 
    FROM sales s 
    LEFT JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id 
    ORDER BY s.sale_date DESC
");
$sales = $stmt->fetchAll();

// Handle AJAX or direct receipt fetch
if (isset($_GET['receipt_id'])) {
    $saleId = intval($_GET['receipt_id']);
    $stmtSale = $pdo->prepare("SELECT s.*, u.full_name as cashier_name, c.full_name as customer_name FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?");
    $stmtSale->execute([$saleId]);
    $saleData = $stmtSale->fetch();

    $stmtItems = $pdo->prepare("SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?");
    $stmtItems->execute([$saleId]);
    $items = $stmtItems->fetchAll();

    header('Content-Type: application/json');
    echo json_encode(['sale' => $saleData, 'items' => $items]);
    exit();
}
?>

<main class="main-content">
  <div class="page-scroller">
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales History</h1>
        <p class="page-subtitle">Track all past POS transactions, payment methods, and receipts</p>
      </div>
      <div>
        <a href="pos.php" class="btn btn-primary">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i> New Sale
        </a>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Date & Time</th>
            <th>Cashier</th>
            <th>Customer</th>
            <th>Payment</th>
            <th>Total Amount</th>
            <th style="text-align: right;">Receipt</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($sales)): ?>
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                No sales records yet. Completed POS sales will appear here.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($sales as $s): ?>
              <tr>
                <td><strong><?= htmlspecialchars($s['receipt_number']) ?></strong></td>
                <td><?= htmlspecialchars($s['sale_date']) ?></td>
                <td><?= htmlspecialchars($s['cashier_name'] ?? 'System') ?></td>
                <td><?= htmlspecialchars($s['customer_name'] ?? 'Walk-in') ?></td>
                <td><span class="badge badge-info"><?= htmlspecialchars($s['payment_method']) ?></span></td>
                <td><strong style="color: var(--primary);">₱<?= number_format($s['total'], 2) ?></strong></td>
                <td style="text-align: right;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="viewReceipt(<?= $s['id'] ?>)">
                    <i data-lucide="receipt" style="width: 14px; height: 14px;"></i> View
                  </button>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

  </div>
</main>

<!-- Modal: View Receipt -->
<div class="modal-overlay" id="viewReceiptModal">
  <div class="modal-content" style="max-width: 400px;">
    <div class="modal-header">
      <h3 class="modal-title">Receipt Details</h3>
      <button type="button" class="btn-icon" onclick="closeModal('viewReceiptModal')">
        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
      </button>
    </div>
    <div class="modal-body" id="receiptModalBody">
      <div style="text-align: center; padding: 2rem;">Loading receipt...</div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeModal('viewReceiptModal')">Close</button>
      <button type="button" class="btn btn-primary" onclick="printReceiptContent()">
        <i data-lucide="printer" style="width: 16px; height: 16px;"></i> Print
      </button>
    </div>
  </div>
</div>

<script>
  async function viewReceipt(saleId) {
    openModal('viewReceiptModal');
    const body = document.getElementById('receiptModalBody');
    body.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading receipt...</div>';

    try {
      const res = await fetch(`sales.php?receipt_id=${saleId}`);
      const data = await res.json();
      const sale = data.sale;
      const items = data.items;

      let itemsHtml = '';
      items.forEach(it => {
        itemsHtml += `
          <tr>
            <td>${it.product_name} x${it.quantity}</td>
            <td style="text-align: right;">₱${Number(it.subtotal).toFixed(2)}</td>
          </tr>
        `;
      });

      body.innerHTML = `
        <div class="receipt-box" id="printArea" style="box-shadow: none; padding: 0;">
          <div class="receipt-header">
            <h4>TECHSTORE POS</h4>
            <p>123 Tech Lane, Gadget City</p>
            <p>Receipt #: <strong>${sale.receipt_number}</strong></p>
            <p>Cashier: ${sale.cashier_name || 'Staff'}</p>
            <p>Date: ${sale.sale_date}</p>
          </div>
          <table class="receipt-table" style="margin: 10px 0;">
            <thead>
              <tr><th>Item</th><th style="text-align: right;">Total</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="receipt-totals">
            <div class="receipt-row"><span>Subtotal:</span><span>₱${Number(sale.subtotal).toFixed(2)}</span></div>
            <div class="receipt-row"><span>Tax:</span><span>₱${Number(sale.tax).toFixed(2)}</span></div>
            <div class="receipt-row bold" style="font-size: 1.1rem; margin-top: 5px;"><span>TOTAL:</span><span>₱${Number(sale.total).toFixed(2)}</span></div>
            <div class="receipt-row"><span>Paid (${sale.payment_method}):</span><span>₱${Number(sale.amount_paid).toFixed(2)}</span></div>
            <div class="receipt-row"><span>Change:</span><span>₱${Number(sale.change_amount).toFixed(2)}</span></div>
          </div>
          <div class="receipt-footer">
            <p>Thank you for your business!</p>
          </div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = '<p style="color: var(--danger); text-align: center;">Failed to load receipt.</p>';
    }
  }

  function printReceiptContent() {
    const content = document.getElementById('printArea').innerHTML;
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt Print</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            .receipt-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
            .receipt-header, .receipt-footer { text-align: center; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
</script>

<?php require_once 'includes/footer.php'; ?>
