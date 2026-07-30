-- Insert Default Categories
INSERT INTO categories (id, name, description) VALUES 
(1, 'Laptop', 'Laptops and Notebooks'),
(2, 'Keyboard', 'Mechanical and Membrane Keyboards'),
(3, 'Mouse', 'Wired and Wireless Mice'),
(4, 'SSD', 'Solid State Drives'),
(5, 'HDD', 'Hard Disk Drives'),
(6, 'RAM', 'Desktop and Laptop Memory')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Products
INSERT INTO products (category_id, name, barcode, price, stock_quantity) VALUES 
(1, 'Gaming Laptop RTX 4060', '8901234', 1299.99, 12),
(1, 'Office Laptop i5', '8901235', 699.99, 25),
(2, 'Mechanical Keyboard Blue Switch', '8901236', 89.99, 45),
(3, 'Wireless Mouse Pro', '8901237', 45.00, 8),
(3, 'Gaming Mouse', '8901238', 59.99, 15),
(4, 'SSD 512GB NVMe', '8901239', 65.00, 30),
(5, 'HDD 1TB', '8901240', 45.00, 40),
(6, 'RAM 16GB DDR4', '8901241', 75.00, 20)
ON CONFLICT (barcode) DO NOTHING;
