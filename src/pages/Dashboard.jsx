import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Users
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    totalSales: 0, todaySales: 0, totalProducts: 0, lowStock: 0,
    recentTransactions: [], bestSellers: [], weeklySales: []
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard-stats')
      .then(res => res.json())
      .then(stats => setData(stats))
      .catch(err => console.error(err));
  }, []);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }), // e.g. Mon, Tue
        dateStr: d.toISOString().split('T')[0],
        sales: 0
      });
    }

    if (data.weeklySales && data.weeklySales.length > 0) {
      data.weeklySales.forEach(ws => {
        const dateObj = new Date(ws.date);
        const ymd = dateObj.toISOString().split('T')[0];
        const match = days.find(d => d.dateStr === ymd);
        if (match) {
          match.sales = Number(ws.sales) || 0;
        }
      });
    }
    return days;
  }, [data.weeklySales]);

  const stats = [
    { title: 'Total Sales', value: `₱${Number(data.totalSales).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <DollarSign size={24} />, color: 'primary' },
    { title: 'Today\'s Sales', value: `₱${Number(data.todaySales).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <CreditCard size={24} />, color: 'success' },
    { title: 'Total Products', value: data.totalProducts, icon: <Package size={24} />, color: 'info' },
    { title: 'Low Stock Items', value: data.lowStock, icon: <AlertTriangle size={24} />, color: 'warning' },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p>Welcome back, here's what's happening today.</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card glass-panel">
            <div className={`stat-icon-wrapper ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h3>Weekly Sales Overview</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Revenue for the last 7 days</p>
          </div>
          <select className="chart-select">
            <option>This Week</option>
            <option>Last Week</option>
            <option>This Month</option>
          </select>
        </div>
        <div className="chart-container" style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="strokeSales" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c5cfc" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#7d8398', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#7d8398', fontSize: 12, fontWeight: 500 }}
                dx={-10}
                tickFormatter={(val) => `₱${val / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-color)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#a78bfa', fontWeight: 600 }}
                labelStyle={{ color: '#7d8398', marginBottom: '4px' }}
                formatter={(value) => [`₱${value.toLocaleString()}`, 'Sales']}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="url(#strokeSales)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-card">
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <button className="btn-secondary" onClick={() => navigate('/sales')}>View All</button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.length === 0 && (
                  <tr><td colSpan="5" className="text-secondary text-center py-4">No recent transactions.</td></tr>
                )}
                {data.recentTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="font-bold">{tx.id_str}</td>
                    <td>{tx.customer}</td>
                    <td className="text-primary">₱{Number(tx.amount).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${tx.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="text-secondary">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="card-header">
            <h3>Best Selling Products</h3>
            <TrendingUp size={20} className="text-secondary" />
          </div>
          <div className="product-list">
            {data.bestSellers.length === 0 && (
              <p className="text-secondary text-center py-4">No sales data yet.</p>
            )}
            {data.bestSellers.map((product, idx) => (
              <div key={idx} className="product-item">
                <div className="product-icon">
                  <Package size={20} />
                </div>
                <div className="product-details">
                  <h4>{product.name}</h4>
                  <p>{product.sales} Sold</p>
                </div>
                <div className="product-stock text-right">
                  <span className={product.stock < 10 ? 'text-warning font-bold' : ''}>
                    {product.stock} in stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;