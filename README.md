# TechStore POS - Pure HTML, CSS, JavaScript & PHP (Zero Framework)

A clean, modern Point of Sale (POS) and Inventory Management System built with **Vanilla HTML5, Pure CSS, Vanilla JavaScript, and Native PHP (MySQL PDO)**.

---

## 🚀 Features

- **Zero Frameworks / No Node.js Required**: No `npm run dev`, no React build steps, no webpack.
- **Modern Responsive Design**: Dark & light theme toggle, glassmorphism accents, and sleek UI.
- **Interactive POS Terminal**:
  - Live product search & category filters.
  - Cart calculation with real-time VAT (12%) and totals.
  - Cash payment and change calculation.
  - Printable sales receipt modal.
- **Inventory & Product Management**:
  - Add, edit, and archive products with barcode support.
  - Real-time stock status (In Stock, Low Stock, Out of Stock).
  - Manual Stock In / Stock Out adjustment logs.
- **Dashboard & Analytics**:
  - Daily revenue, total sales, low stock alerts.
  - 7-day sales chart using Chart.js CDN.
  - Top best selling products list.
- **Role-Based Access**:
  - Administrator (Full access: Dashboard, POS, Products, Categories, Inventory, Customers, Sales, Reports, Settings).
  - Cashier (POS Terminal, Customers, Sales History).

---

## 🛠️ How to Run

### Option A: Using XAMPP (Recommended)
1. Copy or place this folder in your XAMPP `htdocs` directory:
   `C:/xampp/htdocs/techstorepos`
2. Start **Apache** and **MySQL** in the XAMPP Control Panel.
3. Open `http://localhost/phpmyadmin` and create a database named `techstorepos_db`.
4. Import `schema.sql` and `seed.sql`.
5. Open your browser and navigate to:
   **`http://localhost/techstorepos`**

### Option B: Using PHP Built-in Server
1. Ensure MySQL is running on port 3306.
2. Open PowerShell or Terminal in this folder:
   ```bash
   php -S localhost:8000
   ```
3. Open your browser at:
   **`http://localhost:8000`**

---

## 🔑 Default Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin` |
| **Cashier** | `cashier` | `cashier` |

---

## 📂 File Structure

```text
techstorepos/
├── config/
│   └── db.php             # MySQL PDO connection
├── includes/
│   ├── header.php         # HTML head & auth verification
│   ├── sidebar.php        # Navigation menu & role visibility
│   └── footer.php         # Scripts & Lucide icon initialization
├── assets/
│   ├── css/
│   │   ├── style.css      # Core styling, variables, layout, tables, modals
│   │   └── pos.css        # POS grid and order cart styles
│   └── js/
│       ├── app.js         # Theme toggle, toast notifications, modals
│       └── pos.js         # Vanilla JS cart & checkout logic
├── api/
│   └── checkout.php       # Processes sales and decrements stock
├── index.php              # Login page
├── logout.php             # Clears session
├── dashboard.php          # Store analytics & weekly sales chart
├── pos.php                # POS terminal screen
├── products.php           # Product catalog CRUD
├── categories.php         # Category management
├── inventory.php          # Stock movement logs & adjustment
├── sales.php              # Transaction history & receipt viewer
├── customers.php          # Customer directory
├── reports.php            # Sales summaries & report generation
└── settings.php           # Business profile and tax configuration
```
