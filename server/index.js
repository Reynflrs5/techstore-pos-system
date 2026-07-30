const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Auto-migrate: add image_url column if needed, create product_variants table
pool.query(`
  DO $$
  BEGIN
    -- image_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
      ALTER TABLE products ADD COLUMN image_url TEXT;
    END IF;

    -- product_variants table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_variants') THEN
      CREATE TABLE product_variants (
        id          SERIAL PRIMARY KEY,
        product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,  -- e.g. 'color', 'storage', 'ram', 'switch'
        label       TEXT NOT NULL,         -- e.g. 'Black', '512GB', '16GB'
        meta        TEXT,                  -- optional extra (e.g. hex color code)
        price_modifier DECIMAL(10, 2) DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_variants_product ON product_variants(product_id);
    END IF;

    -- price_modifier column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_variants' AND column_name='price_modifier') THEN
      ALTER TABLE product_variants ADD COLUMN price_modifier DECIMAL(10, 2) DEFAULT 0;
    END IF;
  END
  $$;
`).then(async () => {
  // Seed default variants only if table is empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM product_variants');
  if (parseInt(rows[0].count) === 0) {
    const products = await pool.query('SELECT id, name FROM products');
    for (const p of products.rows) {
      const n = p.name.toLowerCase();
      const inserts = [];

      if (n.includes('mouse')) {
        inserts.push(
          ...[['color','Black','#1a1a1a'],['color','White','#f5f5f5'],['color','Red','#e53e3e'],['color','Blue','#3182ce']]
          .map(([type,label,meta,modifier=0]) => pool.query(
            'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1,$2,$3,$4,$5)',
            [p.id, type, label, meta, modifier]
          ))
        );
      }
      if (n.includes('keyboard')) {
        inserts.push(
          ...[['color','Black','#1a1a1a'],['color','White','#f5f5f5'],['color','Gray','#718096'],['color','Pink','#f687b3'],
              ['switch','Blue Switch',null],['switch','Red Switch',null],['switch','Brown Switch',null],['switch','Yellow Switch',null]]
          .map(([type,label,meta,modifier=0]) => pool.query(
            'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1,$2,$3,$4,$5)',
            [p.id, type, label, meta, modifier]
          ))
        );
      }
      if (n.includes('laptop')) {
        inserts.push(
          ...[['storage','256GB SSD',null,0],['storage','512GB SSD',null,1500],['storage','1TB SSD',null,3500],
              ['ram','8GB',null,0],['ram','16GB',null,1200],['ram','32GB',null,3000]]
          .map(([type,label,meta,modifier=0]) => pool.query(
            'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1,$2,$3,$4,$5)',
            [p.id, type, label, meta, modifier]
          ))
        );
      }
      if (n.includes('ssd') || n.includes('nvme')) {
        inserts.push(
          ...[['storage','256GB',null,0],['storage','512GB',null,800],['storage','1TB',null,2000],['storage','2TB',null,4500]]
          .map(([type,label,meta,modifier=0]) => pool.query(
            'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1,$2,$3,$4,$5)',
            [p.id, type, label, meta, modifier]
          ))
        );
      }
      if (n.includes('hdd') || n.includes('hard drive')) {
        inserts.push(
          ...[['storage','500GB',null,0],['storage','1TB',null,500],['storage','2TB',null,1500],['storage','4TB',null,3500]]
          .map(([type,label,meta,modifier=0]) => pool.query(
            'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1,$2,$3,$4,$5)',
            [p.id, type, label, meta, modifier]
          ))
        );
      }
      if (n.includes('ram') || n.includes('ddr') || n.includes('memory')) {
        inserts.push(
          ...[['ram','8GB',null,0],['ram','16GB',null,1200],['ram','32GB',null,3000]]
          .map(([type,label,meta,modifier=0]) => pool.query(
            'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1,$2,$3,$4,$5)',
            [p.id, type, label, meta, modifier]
          ))
        );
      }
      await Promise.all(inserts);
    }
    console.log('✅ Default product variants seeded.');
  }
}).catch(err => console.error('Auto-migration error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// 1. Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// Add a product
app.post('/api/products', async (req, res) => {
  const { name, barcode, category, price, stock_quantity, image_url } = req.body;
  try {
    const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category]);
    const category_id = catRes.rows.length > 0 ? catRes.rows[0].id : null;

    const result = await pool.query(
      'INSERT INTO products (name, barcode, category_id, price, stock_quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, barcode, category_id, price, stock_quantity, image_url]
    );
    const newProduct = result.rows[0];

    if (stock_quantity > 0) {
      await pool.query(
        'INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES ($1, $2, $3, $4)',
        [newProduct.id, 'STOCK_IN', stock_quantity, 'Initial Stock']
      );
    }

    res.json(newProduct);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error adding product' });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, barcode, category, price, stock_quantity, image_url } = req.body;
  try {
    const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category]);
    const category_id = catRes.rows.length > 0 ? catRes.rows[0].id : null;

    const oldProdRes = await pool.query('SELECT stock_quantity FROM products WHERE id = $1', [id]);
    const oldStock = oldProdRes.rows.length > 0 ? oldProdRes.rows[0].stock_quantity : 0;
    const diff = stock_quantity - oldStock;

    const result = await pool.query(
      'UPDATE products SET name = $1, barcode = $2, category_id = $3, price = $4, stock_quantity = $5, image_url = $6 WHERE id = $7 RETURNING *',
      [name, barcode, category_id, price, stock_quantity, image_url, id]
    );

    if (diff !== 0) {
      await pool.query(
        'INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES ($1, $2, $3, $4)',
        [id, diff > 0 ? 'STOCK_IN' : 'STOCK_OUT', Math.abs(diff), 'Manual Adjustment']
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating product' });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error deleting product' });
  }
});

// 2. Login route (Simple demo, in production use hashed passwords/JWT)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role FROM users WHERE username = $1 AND password_hash = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Test connection route
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database()');
    res.json({ message: 'Connected to database successfully!', db_name: result.rows[0].current_database });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to connect to database', details: err.message });
  }
});

// Process a Sale (Checkout)
app.post('/api/sales', async (req, res) => {
  const { user_id, subtotal, tax, discount, total, payment_method, amount_paid, change_amount, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Insert into Sales table
    const receipt_number = 'REC-' + Date.now();
    const saleResult = await client.query(
      `INSERT INTO sales (user_id, receipt_number, subtotal, tax, discount, total, payment_method, amount_paid, change_amount) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [user_id, receipt_number, subtotal, tax, discount, total, payment_method, amount_paid, change_amount]
    );
    const sale_id = saleResult.rows[0].id;

    // 2. Insert Sale Items and Update Inventory
    for (let item of items) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sale_id, item.id, item.quantity, item.price, item.price * item.quantity]
      );

      // Reduce stock
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [item.quantity, item.id]
      );

      // Log inventory
      await client.query(
        `INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES ($1, $2, $3, $4)`,
        [item.id, 'STOCK_OUT', item.quantity, `Sale (Receipt: ${receipt_number})`]
      );
    }

    await client.query('COMMIT'); // Save changes
    res.json({ success: true, receipt_number, sale_id });
  } catch (err) {
    await client.query('ROLLBACK'); // Undo if error
    console.error(err);
    res.status(500).json({ error: 'Checkout failed' });
  } finally {
    client.release();
  }
});

// Get Variants for a product
app.get('/api/products/:id/variants', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY type, id ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching variants' });
  }
});

// Add a variant to a product
app.post('/api/products/:id/variants', async (req, res) => {
  const { id } = req.params;
  const { type, label, meta, price_modifier } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO product_variants (product_id, type, label, meta, price_modifier) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, type, label, meta || null, price_modifier || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error adding variant' });
  }
});

// Delete a variant
app.delete('/api/variants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM product_variants WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error deleting variant' });
  }
});

// Get Dashboard Statistics
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const totalSalesResult = await pool.query('SELECT SUM(total) as total FROM sales');
    const todaySalesResult = await pool.query('SELECT SUM(total) as today FROM sales WHERE DATE(sale_date) = CURRENT_DATE');
    const productCountResult = await pool.query('SELECT COUNT(*) as count FROM products');
    const lowStockResult = await pool.query('SELECT COUNT(*) as low FROM products WHERE stock_quantity < 10');

    // Also get recent transactions
    const recentTxResult = await pool.query(`
      SELECT s.id, s.receipt_number as id_str, 'Customer' as customer, s.total as amount, 'Completed' as status, 
             to_char(s.sale_date, 'HH12:MI AM') as time
      FROM sales s 
      ORDER BY s.sale_date DESC LIMIT 5
    `);

    // Get best selling products
    const bestSellersResult = await pool.query(`
      SELECT p.name, SUM(si.quantity) as sales, p.stock_quantity as stock
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      GROUP BY p.id, p.name, p.stock_quantity
      ORDER BY sales DESC LIMIT 4
    `);

    // Get weekly sales for the chart (last 7 days)
    const weeklySalesResult = await pool.query(`
      SELECT 
        DATE(sale_date) as date,
        SUM(total) as sales
      FROM sales
      WHERE sale_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(sale_date)
      ORDER BY DATE(sale_date) ASC
    `);

    res.json({
      totalSales: totalSalesResult.rows[0].total || 0,
      todaySales: todaySalesResult.rows[0].today || 0,
      totalProducts: productCountResult.rows[0].count,
      lowStock: lowStockResult.rows[0].low,
      recentTransactions: recentTxResult.rows,
      bestSellers: bestSellersResult.rows,
      weeklySales: weeklySalesResult.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
});

// Get Sales History
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.receipt_number, 'Customer' as customer_name, s.subtotal, s.tax, s.discount, s.total, 
             s.payment_method, to_char(s.sale_date, 'YYYY-MM-DD HH12:MI AM') as sale_date
      FROM sales s 
      ORDER BY s.sale_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching sales history' });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching categories' });
  }
});

// Add a category
app.post('/api/categories', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error adding category' });
  }
});

// Update a category
app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating category' });
  }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error deleting category' });
  }
});

// Get Customers
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY full_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching customers' });
  }
});

// Add Customer
app.post('/api/customers', async (req, res) => {
  const { full_name, contact_number, email, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (full_name, contact_number, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, contact_number, email, address]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error adding customer' });
  }
});

// Update Customer
app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, contact_number, email, address } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET full_name = $1, contact_number = $2, email = $3, address = $4 WHERE id = $5 RETURNING *',
      [full_name, contact_number, email, address, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating customer' });
  }
});

// Delete Customer
app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error deleting customer' });
  }
});

// Get Inventory Logs
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id, p.name as product_name, i.transaction_type, i.quantity, i.remarks,
             to_char(i.created_at, 'YYYY-MM-DD HH12:MI AM') as date
      FROM inventory_logs i
      LEFT JOIN products p ON p.id = i.product_id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching inventory logs' });
  }
});

// Add Inventory Log (Manual Stock In/Out)
app.post('/api/inventory', async (req, res) => {
  const { product_id, transaction_type, quantity, remarks } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert Log
    const logResult = await client.query(
      'INSERT INTO inventory_logs (product_id, transaction_type, quantity, remarks) VALUES ($1, $2, $3, $4) RETURNING *',
      [product_id, transaction_type, quantity, remarks]
    );

    // Update Product Stock
    if (transaction_type === 'STOCK_IN' || transaction_type === 'IN') {
      await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [quantity, product_id]);
    } else if (transaction_type === 'STOCK_OUT' || transaction_type === 'OUT') {
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [quantity, product_id]);
    }

    await client.query('COMMIT');
    res.json(logResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server error saving inventory log' });
  } finally {
    client.release();
  }
});

// Get Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
});

// Update Settings
app.put('/api/settings', async (req, res) => {
  const { store_name, address, phone, email, currency_symbol, tax_rate, tax_inclusive } = req.body;
  try {
    // Assuming there's only one row with id 1
    const result = await pool.query(
      `UPDATE settings 
       SET store_name = $1, address = $2, phone = $3, email = $4, 
           currency_symbol = $5, tax_rate = $6, tax_inclusive = $7
       WHERE id = 1 RETURNING *`,
      [store_name, address, phone, email, currency_symbol, tax_rate, tax_inclusive]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating settings' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
