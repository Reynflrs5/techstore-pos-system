const pool = require('./db');

async function fixPrices() {
  try {
    // Realistic Philippine market prices (₱)
    const updates = [
      // Laptops
      { barcode: '8901234', price: 89995.00,  name: 'Gaming Laptop RTX 4060' },   // ~₱90k gaming laptop
      { barcode: '8901235', price: 45995.00,  name: 'Office Laptop i5' },          // ~₱46k office laptop

      // Keyboards
      { barcode: '8901236', price: 3995.00,   name: 'Mechanical Keyboard Blue Switch' }, // ~₱4k mech keyboard

      // Mice
      { barcode: '8901237', price: 2495.00,   name: 'Wireless Mouse Pro' },        // ~₱2.5k wireless mouse
      { barcode: '8901238', price: 3295.00,   name: 'Gaming Mouse' },              // ~₱3.3k gaming mouse

      // SSD
      { barcode: '8901239', price: 3495.00,   name: 'SSD 512GB NVMe' },            // ~₱3.5k 512GB NVMe SSD (base 256GB variant)

      // HDD
      { barcode: '8901240', price: 2795.00,   name: 'HDD 1TB' },                  // ~₱2.8k 1TB HDD (base 500GB variant)

      // RAM
      { barcode: '8901241', price: 2995.00,   name: 'RAM 16GB DDR4' },             // ~₱3k 8GB base price
    ];

    for (const item of updates) {
      const res = await pool.query(
        'UPDATE products SET price = $1 WHERE barcode = $2 RETURNING name, price',
        [item.price, item.barcode]
      );
      if (res.rows.length > 0) {
        console.log(`✅ ${res.rows[0].name}: ₱${Number(res.rows[0].price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      } else {
        console.log(`⚠ Barcode ${item.barcode} not found — skipping.`);
      }
    }

    // Also update the variant price modifiers to be realistic
    // Laptop variants
    await pool.query("UPDATE product_variants SET price_modifier = 0 WHERE label = '256GB SSD'");
    await pool.query("UPDATE product_variants SET price_modifier = 5000 WHERE label = '512GB SSD'");
    await pool.query("UPDATE product_variants SET price_modifier = 12000 WHERE label = '1TB SSD'");
    await pool.query("UPDATE product_variants SET price_modifier = 0 WHERE label = '8GB' AND type = 'ram'");
    await pool.query("UPDATE product_variants SET price_modifier = 3500 WHERE label = '16GB' AND type = 'ram'");
    await pool.query("UPDATE product_variants SET price_modifier = 8500 WHERE label = '32GB' AND type = 'ram'");

    // SSD standalone variants  
    await pool.query("UPDATE product_variants SET price_modifier = 0 WHERE label = '256GB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 1800 WHERE label = '512GB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 4500 WHERE label = '1TB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 9500 WHERE label = '2TB' AND type = 'storage'");

    // HDD variants
    await pool.query("UPDATE product_variants SET price_modifier = 0 WHERE label = '500GB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 1000 WHERE label = '1TB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 3000 WHERE label = '2TB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 6500 WHERE label = '4TB' AND type = 'storage'");

    console.log('\n✅ All variant price modifiers updated to realistic values!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

fixPrices();
