-- TechStore POS Database Schema

-- 1. Users Table (Admin, Cashier)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cashier')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sales Table (Transactions)
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    change_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sale Items Table
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- 7. Inventory Table (Stock In/Out Logs)
CREATE TABLE inventory_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT')),
    quantity INTEGER NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Admin User (Password should be hashed in production, here we use 'admin' as plain for now)
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', 'admin', 'System Administrator', 'admin');

-- Insert Default Cashier User
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('cashier', 'cashier', 'Default Cashier', 'cashier');
