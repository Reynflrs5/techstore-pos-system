<?php
// api/checkout.php - Process POS Transaction
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['items']) || !is_array($input['items'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Cart is empty or invalid data']);
    exit();
}

$userId = $_SESSION['user']['id'] ?? ($input['user_id'] ?? null);
$subtotal = floatval($input['subtotal'] ?? 0);
$tax = floatval($input['tax'] ?? 0);
$discount = floatval($input['discount'] ?? 0);
$total = floatval($input['total'] ?? 0);
$paymentMethod = $input['payment_method'] ?? 'Cash';
$amountPaid = floatval($input['amount_paid'] ?? $total);
$changeAmount = floatval($input['change_amount'] ?? ($amountPaid - $total));
$customerId = !empty($input['customer_id']) ? intval($input['customer_id']) : null;

$receiptNumber = 'REC-' . strtoupper(dechex(time())) . '-' . rand(100, 999);

$pdo->beginTransaction();
try {
    $stmtSale = $pdo->prepare("
        INSERT INTO sales (user_id, customer_id, receipt_number, subtotal, tax, discount, total, payment_method, amount_paid, change_amount, sale_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmtSale->execute([
        $userId,
        $customerId,
        $receiptNumber,
        $subtotal,
        $tax,
        $discount,
        $total,
        $paymentMethod,
        $amountPaid,
        $changeAmount
    ]);
    $saleId = $pdo->lastInsertId();

    $stmtItem = $pdo->prepare("
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmtStock = $pdo->prepare("
        UPDATE products 
        SET stock_quantity = GREATEST(0, stock_quantity - ?) 
        WHERE id = ?
    ");
    $stmtLog = $pdo->prepare("
        INSERT INTO inventory_logs (product_id, user_id, transaction_type, quantity, remarks)
        VALUES (?, ?, 'STOCK_OUT', ?, ?)
    ");

    foreach ($input['items'] as $item) {
        $prodId = intval($item['id']);
        $qty = intval($item['quantity'] ?? $item['qty'] ?? 1);
        $price = floatval($item['price']);
        $itemSubtotal = $price * $qty;

        $stmtItem->execute([$saleId, $prodId, $qty, $price, $itemSubtotal]);
        $stmtStock->execute([$qty, $prodId]);
        $stmtLog->execute([$prodId, $userId, $qty, "POS Sale #$receiptNumber"]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'sale_id' => $saleId,
        'receipt_number' => $receiptNumber,
        'total' => $total,
        'amount_paid' => $amountPaid,
        'change_amount' => $changeAmount,
        'date' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Transaction failed: ' . $e->getMessage()
    ]);
}
