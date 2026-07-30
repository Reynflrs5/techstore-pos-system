require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'techstorepos_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const updateImages = async () => {
  try {
    // Ensure column exists first
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
          ALTER TABLE products ADD COLUMN image_url TEXT;
        END IF;
      END
      $$;
    `);

    // Get all products
    const { rows: products } = await pool.query('SELECT id, name FROM products');
    console.log(`Found ${products.length} products. Updating images...`);

    for (let p of products) {
      let img = 'https://images.unsplash.com/photo-1531297172867-4d6537f05218?w=500&q=80'; // default tech
      
      const name = p.name.toLowerCase();
      if (name.includes('laptop') || name.includes('macbook')) {
        img = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80';
      } else if (name.includes('phone') || name.includes('iphone')) {
        img = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80';
      } else if (name.includes('headphone') || name.includes('airpods') || name.includes('audio')) {
        img = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
      } else if (name.includes('mouse')) {
        img = 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80';
      } else if (name.includes('keyboard')) {
        img = 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80';
      } else if (name.includes('monitor') || name.includes('screen')) {
        img = 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80';
      } else if (name.includes('watch')) {
        img = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80';
      } else if (name.includes('cable') || name.includes('charger')) {
        img = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80';
      } else if (name.includes('ssd') || name.includes('drive') || name.includes('storage') || name.includes('hdd')) {
        img = 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=500&q=80';
      } else if (name.includes('ram') || name.includes('memory')) {
        img = 'https://images.unsplash.com/photo-1541029071515-84cc54f84dc5?w=500&q=80';
      }

      await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [img, p.id]);
    }
    
    console.log('Successfully added real pictures to all existing products!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
};

updateImages();
