import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        <Sidebar userRole={userRole} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
        <main className="main-content">
          <div className="page-scroller">
          <Routes>
            <Route 
              path="/" 
              element={<Navigate to={userRole === 'admin' ? "/dashboard" : "/pos"} replace />} 
            />
            <Route path="/dashboard" element={userRole === 'admin' ? <Dashboard /> : <Navigate to="/pos" replace />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
