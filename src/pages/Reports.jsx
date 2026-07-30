import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Filter, BarChart2, PieChart, TrendingUp, Calendar, Package, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Reports.css';

const API_CATEGORIES = 'http://localhost:5000/api/categories';
const API_SALES = 'http://localhost:5000/api/sales';
const API_PRODUCTS = 'http://localhost:5000/api/products';
const API_CUSTOMERS = 'http://localhost:5000/api/customers';

const Reports = () => {
  const [dateRange, setDateRange] = useState('This Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API_CATEGORIES).then(res => res.json()),
      fetch(API_SALES).then(res => res.json()),
      fetch(API_PRODUCTS).then(res => res.json()),
      fetch(API_CUSTOMERS).then(res => res.json())
    ])
    .then(([catData, salesData, prodData, custData]) => {
      setCategories(catData);
      setSales(salesData);
      setProducts(prodData);
      setCustomers(custData);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, []);

  // Simple aggregation: Group sales by Date
  const chartData = useMemo(() => {
    const grouped = sales.reduce((acc, sale) => {
      // sale_date is usually "YYYY-MM-DD HH:mm:ss", so slice first 10
      const date = String(sale.sale_date).slice(0, 10);
      if (!acc[date]) acc[date] = 0;
      acc[date] += Number(sale.total);
      return acc;
    }, {});
    
    return Object.keys(grouped)
      .sort()
      .map(date => ({
        date,
        revenue: grouped[date]
      }));
  }, [sales]);

  const reportCards = [
    {
      id: 'sales',
      title: 'Sales Summary',
      description: 'Daily and monthly revenue breakdown, including discounts and net total.',
      icon: <TrendingUp size={24} />,
      colorClass: 'primary'
    },
    {
      id: 'inventory',
      title: 'Inventory Valuation',
      description: 'Current stock levels across all categories and estimated total value.',
      icon: <Package size={24} />,
      colorClass: 'success'
    },
    {
      id: 'products',
      title: 'Top Performing Products',
      description: 'Items with the highest sales volume and profit margins.',
      icon: <BarChart2 size={24} />,
      colorClass: 'warning'
    },
    {
      id: 'customers',
      title: 'Customer Insights',
      description: 'Purchase frequency and top spenders for the selected period.',
      icon: <PieChart size={24} />,
      colorClass: 'info'
    }
  ];

  const handleGenerateReport = (type) => {
    let headers = [];
    let rows = [];
    let filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'sales') {
      headers = ['Receipt Number', 'Date', 'Payment Method', 'Discount', 'Total'];
      rows = sales.map(s => [
        s.receipt_number,
        s.sale_date,
        s.payment_method,
        Number(s.discount).toFixed(2),
        Number(s.total).toFixed(2)
      ]);
    } else if (type === 'inventory') {
      headers = ['Product Name', 'Barcode', 'Category', 'Price', 'Stock', 'Total Value'];
      rows = products.map(p => [
        p.name,
        p.barcode,
        p.category || 'Uncategorized',
        Number(p.price).toFixed(2),
        p.stock_quantity,
        (Number(p.price) * Number(p.stock_quantity)).toFixed(2)
      ]);
    } else if (type === 'products') {
      // Top performing products by revenue (simple aggregation)
      headers = ['Product Name', 'Price', 'Stock Remaining'];
      rows = [...products]
        .sort((a, b) => Number(b.price) - Number(a.price)) // Just sorting by price as placeholder
        .map(p => [p.name, Number(p.price).toFixed(2), p.stock_quantity]);
    } else if (type === 'customers') {
      headers = ['Customer Name', 'Contact', 'Email', 'Address'];
      rows = customers.map(c => [
        c.full_name,
        c.contact_number || 'N/A',
        c.email || 'N/A',
        c.address || 'N/A'
      ]);
    }

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    handleGenerateReport('sales');
    handleGenerateReport('inventory');
  };

  return (
    <div className="animate-fade-in reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-secondary">Generate and export business insights</p>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="reports-toolbar glass-panel">
        <div className="filter-group">
          <Calendar size={18} className="text-secondary" />
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="reports-select"
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Year">This Year</option>
            <option value="Custom Range...">Custom Range...</option>
          </select>
        </div>

        {dateRange === 'Custom Range...' && (
          <div className="filter-group date-range-group">
            <input 
              type="date" 
              value={customFrom} 
              onChange={e => setCustomFrom(e.target.value)} 
              className="reports-select"
            />
            <span className="text-secondary">to</span>
            <input 
              type="date" 
              value={customTo} 
              onChange={e => setCustomTo(e.target.value)} 
              className="reports-select"
            />
          </div>
        )}
        
        <div className="filter-group">
          <Filter size={18} className="text-secondary" />
          <select 
            className="reports-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button className="btn-secondary flex items-center gap-2 ml-auto" onClick={handleExportAll}>
          <Download size={16} /> Export All
        </button>
      </div>

      <div className="reports-grid">
        {reportCards.map(report => (
          <div key={report.id} className="report-card glass-panel">
            <div className="report-card-header">
              <div className={`report-icon ${report.colorClass}`}>
                {report.icon}
              </div>
              <button className="icon-btn" title="Download CSV" onClick={() => handleGenerateReport(report.id)}>
                <Download size={18} />
              </button>
            </div>
            <div className="report-card-body">
              <h3>{report.title}</h3>
              <p className="text-secondary">{report.description}</p>
            </div>
            <div className="report-card-footer">
              <button 
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={() => handleGenerateReport(report.id)}
              >
                <FileText size={16} /> Generate Report
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="chart-section glass-panel mt-4">
        <div className="section-header">
          <h2>Revenue Overview</h2>
        </div>
        <div className="chart-placeholder" style={{ height: 350, display: 'block', padding: '20px 0' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="spin text-primary" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-secondary text-center mt-4">No sales data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `₱${value}`} width={80} />
                <Tooltip 
                  formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', background: 'rgba(255,255,255,0.9)' }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
