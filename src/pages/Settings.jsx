import { useState, useEffect } from 'react';
import { Store, Receipt, Users, Database, Save, Loader2 } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('store');
  const [isSaving, setIsSaving] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    store_name: '',
    address: '',
    phone: '',
    email: '',
    currency_symbol: 'PHP',
    tax_rate: 12,
    tax_inclusive: true
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) setStoreSettings(data);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeSettings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-secondary">Manage your store preferences and configurations</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-layout">
        {/* Settings Sidebar */}
        <aside className="settings-sidebar glass-panel">
          <nav className="settings-nav">
            <button
              className={`settings-tab ${activeTab === 'store' ? 'active' : ''}`}
              onClick={() => setActiveTab('store')}
            >
              <Store size={18} /> Store Details
            </button>
            <button
              className={`settings-tab ${activeTab === 'tax' ? 'active' : ''}`}
              onClick={() => setActiveTab('tax')}
            >
              <Receipt size={18} /> Tax & Currency
            </button>
            <button
              className={`settings-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} /> User Accounts
            </button>
            <button
              className={`settings-tab ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              <Database size={18} /> Backup & Restore
            </button>
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="settings-content glass-panel">
          {activeTab === 'store' && (
            <div className="settings-section animate-fade-in">
              <div className="section-header">
                <h2>Store Details</h2>
                <p className="text-secondary">Information that appears on receipts and reports.</p>
              </div>
              <form className="settings-form" onSubmit={handleSave}>
                <label>
                  Store Name
                  <input
                    type="text"
                    value={storeSettings.store_name}
                    onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
                  />
                </label>
                <label>
                  Store Address
                  <textarea
                    rows={3}
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Phone Number
                    <input
                      type="text"
                      value={storeSettings.phone}
                      onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                    />
                  </label>
                  <label>
                    Email Address
                    <input
                      type="email"
                      value={storeSettings.email}
                      onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                    />
                  </label>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="settings-section animate-fade-in">
              <div className="section-header">
                <h2>Tax & Currency</h2>
                <p className="text-secondary">Configure VAT and default currency display.</p>
              </div>
              <form className="settings-form" onSubmit={handleSave}>
                <div className="form-row">
                  <label>
                    Currency Symbol
                    <select 
                      value={storeSettings.currency_symbol}
                      onChange={(e) => setStoreSettings({ ...storeSettings, currency_symbol: e.target.value })}
                    >
                      <option value="PHP">₱ (PHP)</option>
                      <option value="USD">$ (USD)</option>
                      <option value="EUR">€ (EUR)</option>
                    </select>
                  </label>
                  <label>
                    Tax Rate (%)
                    <input 
                      type="number" 
                      min="0" step="0.1" 
                      value={storeSettings.tax_rate}
                      onChange={(e) => setStoreSettings({ ...storeSettings, tax_rate: e.target.value })}
                    />
                  </label>
                </div>
                <div className="checkbox-wrap">
                  <input 
                    type="checkbox" 
                    id="tax_inclusive" 
                    checked={storeSettings.tax_inclusive}
                    onChange={(e) => setStoreSettings({ ...storeSettings, tax_inclusive: e.target.checked })}
                  />
                  <label htmlFor="tax_inclusive">Prices are tax inclusive</label>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="settings-section animate-fade-in">
              <div className="section-header">
                <h2>User Accounts</h2>
                <p className="text-secondary">Manage admin and cashier roles.</p>
              </div>
              <div className="users-list">
                <div className="user-card">
                  <div className="user-info">
                    <div className="user-avatar admin">A</div>
                    <div>
                      <strong>Admin User</strong>
                      <span className="user-role badge badge-primary">Admin</span>
                    </div>
                  </div>
                  <button className="btn-secondary">Edit</button>
                </div>
                <div className="user-card">
                  <div className="user-info">
                    <div className="user-avatar cashier">C</div>
                    <div>
                      <strong>Cashier One</strong>
                      <span className="user-role badge badge-secondary">Cashier</span>
                    </div>
                  </div>
                  <button className="btn-secondary">Edit</button>
                </div>
                <button className="btn-primary flex items-center gap-2 mt-4">
                  <Users size={16} /> Add New User
                </button>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="settings-section animate-fade-in">
              <div className="section-header">
                <h2>Backup & Restore</h2>
                <p className="text-secondary">Safeguard your data by creating periodic backups.</p>
              </div>
              <div className="database-actions">
                <div className="action-card">
                  <div className="action-icon text-primary">
                    <Database size={24} />
                  </div>
                  <div>
                    <h4>Export Backup</h4>
                    <p className="text-secondary">Download a full SQL dump of your database.</p>
                  </div>
                  <button className="btn-primary">Generate Backup</button>
                </div>
                
                <div className="action-card">
                  <div className="action-icon text-warning">
                    <Save size={24} />
                  </div>
                  <div>
                    <h4>Restore Database</h4>
                    <p className="text-secondary">Upload a previous backup file.</p>
                  </div>
                  <button className="btn-secondary">Upload Backup</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
