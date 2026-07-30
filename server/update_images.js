const pool = require('./db');

const updates = [
  { name: 'Gaming Laptop RTX 4060', url: '/images/Gaming Laptop RTX 4060.jpe' },
  { name: 'Office Laptop i5',       url: '/images/Office Laptop i5.jpe' },
  { name: 'Gaming Mouse',           url: '/images/Gaming Mouse.png' },
  { name: 'Wireless Mouse Pro',     url: '/images/Wireless Mouse Pro.png' },
  { name: 'Mechanical Keyboard Blue Switch', url: '/images/Mechanical Keyboard Blue Switch.jpe' },
  { name: 'HDD 1TB',                url: '/images/HDD 1TB.jpe' },
  { name: 'SSD 512GB NVMe',         url: '/images/SSD 512GB NVMe.png' },
  { name: 'RAM 16GB DDR4',          url: '/images/RAM 16GB DDR4.png' },
];

async function run() {
  try {
    for (const item of updates) {
      const result = await pool.query(
        'UPDATE products SET image_url = $1 WHERE name = $2 RETURNING id, name, image_url',
        [item.url, item.name]
      );
      if (result.rows.length > 0) {
        console.log(`✅ "${result.rows[0].name}" → ${result.rows[0].image_url}`);
      } else {
        console.log(`⚠️  No match found for: "${item.name}"`);
      }
    }
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
