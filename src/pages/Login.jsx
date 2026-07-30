import { useState } from 'react';
import { Cpu, Lock, User, ChevronRight, Monitor, Box, BarChart2, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user.role);
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Could not connect to the server. Is it running?');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-image-side animate-fade-in">
        <div className="image-overlay"></div>

        <div className="image-content">
          <div className="brand-badge">
            <Cpu size={20} />
            <span>TechStore POS</span>
          </div>
          <h1 className="hero-text">
            Run your store with <span className="accent">modern efficiency.</span>
          </h1>
          <p className="hero-subtext">
            Seamless point of sale, real-time inventory tracking, and deep sales
            analytics — all in one platform.
          </p>

          <div className="feature-row">
            <span className="feature-chip"><Monitor size={14} /> Point of Sale</span>
            <span className="feature-chip"><Box size={14} /> Inventory</span>
            <span className="feature-chip"><BarChart2 size={14} /> Analytics</span>
          </div>
        </div>

        <div className="floating-stat-card">
          <div className="fs-label">
            <span className="fs-dot" />
            Today's Sales
          </div>
          <div className="fs-value">₱24,850.00</div>
          <div className="fs-delta">↑ 12.4% vs yesterday</div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or cashier"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn">
              <span>Sign In</span>
              <ChevronRight size={18} />
            </button>
          </form>

          <div className="login-footer">
            <p>Demo Credentials</p>
            <div className="credentials-grid">
              <div className="cred-box">
                <span className="cred-role">Admin</span>
                <span className="cred-text">admin / admin</span>
              </div>
              <div className="cred-box">
                <span className="cred-role">Cashier</span>
                <span className="cred-text">cashier / cashier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;