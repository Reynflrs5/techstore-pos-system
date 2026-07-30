const pool = require('./db');

async function updateDB() {
  try {
    // Add column if not exists
    await pool.query(`
      ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price_modifier DECIMAL(10, 2) DEFAULT 0;
    `);

    // Update prices
    await pool.query("UPDATE product_variants SET price_modifier = 0 WHERE label = '256GB SSD' OR label = '256GB' OR label = '500GB' OR label = '8GB'");
    await pool.query("UPDATE product_variants SET price_modifier = 1500 WHERE label = '512GB SSD'");
    await pool.query("UPDATE product_variants SET price_modifier = 800 WHERE label = '512GB'");
    await pool.query("UPDATE product_variants SET price_modifier = 3500 WHERE label = '1TB SSD'");
    await pool.query("UPDATE product_variants SET price_modifier = 2000 WHERE label = '1TB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 4500 WHERE label = '2TB'");
    await pool.query("UPDATE product_variants SET price_modifier = 3500 WHERE label = '4TB'");
    
    // RAM
    await pool.query("UPDATE product_variants SET price_modifier = 1200 WHERE label = '16GB'");
    await pool.query("UPDATE product_variants SET price_modifier = 3000 WHERE label = '32GB'");

    // For HDDs
    await pool.query("UPDATE product_variants SET price_modifier = 500 WHERE label = '1TB' AND type = 'storage'");
    await pool.query("UPDATE product_variants SET price_modifier = 1500 WHERE label = '2TB'");

    console.log("Database updated successfully");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

updateDB();
