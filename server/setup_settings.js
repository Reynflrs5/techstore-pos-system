import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '572128',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'techstorepos_db',
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        store_name VARCHAR(255),
        address TEXT,
        phone VARCHAR(255),
        email VARCHAR(255),
        currency_symbol VARCHAR(10) DEFAULT 'PHP',
        tax_rate DECIMAL(5,2) DEFAULT 12.00,
        tax_inclusive BOOLEAN DEFAULT true
      );
    `);
    
    // Insert default if empty
    const res = await pool.query('SELECT COUNT(*) FROM settings');
    if (parseInt(res.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO settings (store_name, address, phone, email, currency_symbol, tax_rate, tax_inclusive)
        VALUES ('TechStore POS', '123 Tech Lane, Gadget City, 1000', '0917 123 4567', 'hello@techstore.com', 'PHP', 12.00, true);
      `);
    }
    console.log('Settings table ready!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
