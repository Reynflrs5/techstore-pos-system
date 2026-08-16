<?php
require_once __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Helper to get request body
function getJsonBody() {
    return json_decode(file_get_contents('php://input'), true);
}

// Router logic
if (preg_match('#^/api/products/(\d+)/variants$#', $request_uri, $matches)) {
    $id = $matches[1];
    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY type, id ASC");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetchAll());
        exit;
    } elseif ($method === 'POST') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$id, $data['type'], $data['label'], $data['meta'] ?? null, $data['price_modifier'] ?? 0]);
        $variantId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM product_variants WHERE id = ?");
        $stmt->execute([$variantId]);
        echo json_encode($stmt->fetch());
        exit;
    }
} elseif (preg_match('#^/api/products/(\d+)$#', $request_uri, $matches)) {
    $id = $matches[1];
    if ($method === 'PUT') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $stmt->execute([$data['category']]);
        $cat = $stmt->fetch();
        $category_id = $cat ? $cat['id'] : null;

        $stmt = $pdo->prepare("SELECT stock_quantity FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $oldStock = $stmt->fetchColumn() ?: 0;
        $diff = $data['stock_quantity'] - $oldStock;

        $stmt = $pdo->prepare("UPDATE products SET name = ?, barcode = ?, category_id = ?, price = ?, stock_quantity = ?, image_url = ?, description = ? WHERE id = ?");
        $stmt->execute([$data['name'], $data['barcode'], $category_id, $data['price'], $data['stock_quantity'], $data['image_url'], $data['description'] ?? null, $id]);

        if ($diff !== 0) {
            $type = $diff > 0 ? 'STOCK_IN' : 'STOCK_OUT';
            $stmt = $pdo->prepare("INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES (?, ?, ?, ?)");
            $stmt->execute([$id, $type, abs($diff), 'Manual Adjustment']);
        }

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        exit;
    } elseif ($method === 'DELETE') {
        try {
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'deleted' => true]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Foreign key constraint violation
                // Fallback to archiving the product
                $stmt = $pdo->prepare("UPDATE products SET is_archived = 1 WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'archived' => true]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Database error while deleting product.']);
            }
        }
        exit;
    }
} elseif ($request_uri === '/api/products') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_archived = 0 ORDER BY p.name ASC");
        echo json_encode($stmt->fetchAll());
        exit;
    } elseif ($method === 'POST') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $stmt->execute([$data['category']]);
        $cat = $stmt->fetch();
        $category_id = $cat ? $cat['id'] : null;

        $stmt = $pdo->prepare("INSERT INTO products (name, barcode, category_id, price, stock_quantity, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$data['name'], $data['barcode'], $category_id, $data['price'], $data['stock_quantity'], $data['image_url'], $data['description'] ?? null]);
        $id = $pdo->lastInsertId();

        if ($data['stock_quantity'] > 0) {
            $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES (?, ?, ?, ?)");
            $stmtLog->execute([$id, 'STOCK_IN', $data['stock_quantity'], 'Initial Stock']);
        }

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        exit;
    }
} elseif (preg_match('#^/api/variants/(\d+)$#', $request_uri, $matches)) {
    $id = $matches[1];
    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM product_variants WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }
} elseif ($request_uri === '/api/login') {
    if ($method === 'POST') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("SELECT id, username, full_name, role FROM users WHERE username = ? AND password_hash = ?");
        $stmt->execute([$data['username'], $data['password']]);
        $user = $stmt->fetch();
        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }
        exit;
    }
} elseif ($request_uri === '/api/test-db') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT DATABASE() as db");
        $res = $stmt->fetch();
        echo json_encode(['message' => 'Connected to database successfully!', 'db_name' => $res['db']]);
        exit;
    }
} elseif ($request_uri === '/api/sales') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT s.id, s.receipt_number, 'Customer' as customer_name, s.subtotal, s.tax, s.discount, s.total, s.payment_method, DATE_FORMAT(s.sale_date, '%Y-%m-%d %h:%i %p') as sale_date FROM sales s ORDER BY s.sale_date DESC");
        echo json_encode($stmt->fetchAll());
        exit;
    } elseif ($method === 'POST') {
        $data = getJsonBody();
        $pdo->beginTransaction();
        try {
            $receipt_number = 'REC-' . time();
            $stmt = $pdo->prepare("INSERT INTO sales (user_id, receipt_number, subtotal, tax, discount, total, payment_method, amount_paid, change_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['user_id'] ?? null, $receipt_number, $data['subtotal'], $data['tax'], $data['discount'], $data['total'], $data['payment_method'], $data['amount_paid'], $data['change_amount']]);
            $sale_id = $pdo->lastInsertId();

            $stmtItem = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
            $stmtUpdate = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
            $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES (?, ?, ?, ?)");
            
            foreach ($data['items'] as $item) {
                $stmtItem->execute([$sale_id, $item['id'], $item['quantity'], $item['price'], $item['price'] * $item['quantity']]);
                $stmtUpdate->execute([$item['quantity'], $item['id']]);
                $stmtLog->execute([$item['id'], 'STOCK_OUT', $item['quantity'], "Sale (Receipt: $receipt_number)"]);
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'receipt_number' => $receipt_number, 'sale_id' => $sale_id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Checkout failed', 'details' => $e->getMessage()]);
        }
        exit;
    }
} elseif ($request_uri === '/api/dashboard-stats') {
    if ($method === 'GET') {
        $totalSales = $pdo->query("SELECT SUM(total) as total FROM sales")->fetchColumn() ?: 0;
        $todaySales = $pdo->query("SELECT SUM(total) as today FROM sales WHERE DATE(sale_date) = CURDATE()")->fetchColumn() ?: 0;
        $totalProducts = $pdo->query("SELECT COUNT(*) as count FROM products")->fetchColumn();
        $lowStock = $pdo->query("SELECT COUNT(*) as low FROM products WHERE stock_quantity < 10")->fetchColumn();

        $recentTx = $pdo->query("SELECT s.id, s.receipt_number as id_str, 'Customer' as customer, s.total as amount, 'Completed' as status, DATE_FORMAT(s.sale_date, '%h:%i %p') as time FROM sales s ORDER BY s.sale_date DESC LIMIT 5")->fetchAll();
        $bestSellers = $pdo->query("SELECT p.name, SUM(si.quantity) as sales, p.stock_quantity as stock FROM sale_items si JOIN products p ON p.id = si.product_id GROUP BY p.id, p.name, p.stock_quantity ORDER BY sales DESC LIMIT 4")->fetchAll();
        $weeklySales = $pdo->query("SELECT DATE(sale_date) as date, SUM(total) as sales FROM sales WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(sale_date) ORDER BY DATE(sale_date) ASC")->fetchAll();

        echo json_encode([
            'totalSales' => $totalSales,
            'todaySales' => $todaySales,
            'totalProducts' => $totalProducts,
            'lowStock' => $lowStock,
            'recentTransactions' => $recentTx,
            'bestSellers' => $bestSellers,
            'weeklySales' => $weeklySales
        ]);
        exit;
    }
} elseif (preg_match('#^/api/categories/(\d+)$#', $request_uri, $matches)) {
    $id = $matches[1];
    if ($method === 'PUT') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?");
        $stmt->execute([$data['name'], $data['description'], $id]);
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        exit;
    } elseif ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }
} elseif ($request_uri === '/api/categories') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id GROUP BY c.id ORDER BY c.name ASC");
        echo json_encode($stmt->fetchAll());
        exit;
    } elseif ($method === 'POST') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['description']]);
        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        exit;
    }
} elseif (preg_match('#^/api/customers/(\d+)$#', $request_uri, $matches)) {
    $id = $matches[1];
    if ($method === 'PUT') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("UPDATE customers SET full_name = ?, contact_number = ?, email = ?, address = ? WHERE id = ?");
        $stmt->execute([$data['full_name'], $data['contact_number'], $data['email'], $data['address'], $id]);
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        exit;
    } elseif ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Customer deleted successfully']);
        exit;
    }
} elseif ($request_uri === '/api/customers') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM customers ORDER BY full_name ASC");
        echo json_encode($stmt->fetchAll());
        exit;
    } elseif ($method === 'POST') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("INSERT INTO customers (full_name, contact_number, email, address) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['full_name'], $data['contact_number'], $data['email'], $data['address']]);
        $id = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        exit;
    }
} elseif ($request_uri === '/api/inventory') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT i.id, p.name as product_name, i.transaction_type, i.quantity, i.remarks, DATE_FORMAT(i.created_at, '%Y-%m-%d %h:%i %p') as date FROM inventory_logs i LEFT JOIN products p ON p.id = i.product_id ORDER BY i.created_at DESC");
        echo json_encode($stmt->fetchAll());
        exit;
    } elseif ($method === 'POST') {
        $data = getJsonBody();
        $pdo->beginTransaction();
        try {
            $stmtLog = $pdo->prepare("INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES (?, ?, ?, ?)");
            $stmtLog->execute([$data['product_id'], $data['transaction_type'], $data['quantity'], $data['remarks']]);
            $logId = $pdo->lastInsertId();

            if ($data['transaction_type'] === 'STOCK_IN' || $data['transaction_type'] === 'IN') {
                $stmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
                $stmt->execute([$data['quantity'], $data['product_id']]);
            } else if ($data['transaction_type'] === 'STOCK_OUT' || $data['transaction_type'] === 'OUT') {
                $stmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
                $stmt->execute([$data['quantity'], $data['product_id']]);
            }

            $pdo->commit();
            $stmt = $pdo->prepare("SELECT * FROM inventory_logs WHERE id = ?");
            $stmt->execute([$logId]);
            echo json_encode($stmt->fetch());
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Server error saving inventory log']);
        }
        exit;
    }
} elseif ($request_uri === '/api/settings') {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM settings LIMIT 1");
        echo json_encode($stmt->fetch());
        exit;
    } elseif ($method === 'PUT') {
        $data = getJsonBody();
        $stmt = $pdo->prepare("UPDATE settings SET store_name = ?, address = ?, phone = ?, email = ?, currency_symbol = ?, tax_rate = ?, tax_inclusive = ? WHERE id = 1");
        $stmt->execute([$data['store_name'], $data['address'], $data['phone'], $data['email'], $data['currency_symbol'], $data['tax_rate'], $data['tax_inclusive']]);
        
        $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1");
        echo json_encode($stmt->fetch());
        exit;
    }
}

// Fallback for not found
http_response_code(404);
echo json_encode(['error' => 'Not Found']);
