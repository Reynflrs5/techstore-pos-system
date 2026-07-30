import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Plus,
  Minus,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  X,
  Loader2,
} from 'lucide-react';
import './Inventory.css';
import ModalPortal from '../components/ModalPortal';

const INVENTORY_URL = 'http://localhost:5000/api/inventory';
const PRODUCTS_URL = 'http://localhost:5000/api/products';

const emptyForm = { product_id: '', quantity: '', remarks: '' };

const Inventory = () => {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('STOCK_IN'); // or 'STOCK_OUT'
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadLogs = () => {
    setLoading(true);
    fetch(INVENTORY_URL)
      .then((res) => res.json())
      .then((data) => setLogs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
    fetch(PRODUCTS_URL)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = (log.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || log.transaction_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, typeFilter]);

  const summary = useMemo(() => {
    const stockIn = logs
      .filter((l) => l.transaction_type === 'STOCK_IN')
      .reduce((sum, l) => sum + Number(l.quantity), 0);
    const stockOut = logs
      .filter((l) => l.transaction_type === 'STOCK_OUT')
      .reduce((sum, l) => sum + Number(l.quantity), 0);
    return { stockIn, stockOut, net: stockIn - stockOut, totalLogs: logs.length };
  }, [logs]);

  const openModal = (mode) => {
    setModalMode(mode);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity || Number(formData.quantity) <= 0) {
      setFormError('Select a product and enter a quantity greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      product_id: formData.product_id,
      quantity: Number(formData.quantity),
      transaction_type: modalMode,
      remarks: formData.remarks,
    };

    try {
      // Assumes POST /api/inventory records the movement and adjusts
      // the product's stock server-side. Adjust if your API differs.
      const res = await fetch(INVENTORY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Request failed');

      setIsModalOpen(false);
      loadLogs();
    } catch (err) {
      setFormError('Could not save this movement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Logs</h1>
          <p className="text-secondary">
            {loading ? 'Loading logs…' : `${filteredLogs.length} of ${logs.length} entries`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-2" onClick={() => openModal('STOCK_IN')}>
            <Plus size={18} /> Stock In
          </button>
          <button className="btn-danger flex items-center gap-2" onClick={() => openModal('STOCK_OUT')}>
            <Minus size={18} /> Stock Out
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon success">
            <ArrowUpCircle size={20} />
          </div>
          <div>
            <h4>{summary.stockIn}</h4>
            <p>Total Stock In</p>
          </div>
        </div>
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon danger">
            <ArrowDownCircle size={20} />
          </div>
          <div>
            <h4>{summary.stockOut}</h4>
            <p>Total Stock Out</p>
          </div>
        </div>
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon primary">
            <Layers size={20} />
          </div>
          <div>
            <h4>{summary.net >= 0 ? `+${summary.net}` : summary.net}</h4>
            <p>Net Movement</p>
          </div>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-search glass-panel">
          <Search size={18} className="text-secondary" />
          <input
            type="text"
            placeholder="Search by product name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="type-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All transactions</option>
          <option value="STOCK_IN">Stock In</option>
          <option value="STOCK_OUT">Stock Out</option>
        </select>
      </div>

      <div className="card glass-panel table-container">
        {loading ? (
          <div className="inventory-skeleton">
            {[...Array(5)].map((_, i) => (
              <div className="skeleton-row" key={i} />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <Box size={40} className="text-secondary" />
            <p className="text-secondary">
              {logs.length === 0
                ? 'No inventory logs found. Record a Stock In or Stock Out to get started.'
                : 'No logs match your search or filter.'}
            </p>
          </div>
        ) : (
          <table className="data-table inventory-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product Name</th>
                <th>Transaction</th>
                <th>Quantity</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Date" className="text-secondary">{log.date}</td>
                  <td data-label="Product Name" className="font-bold">{log.product_name}</td>
                  <td data-label="Transaction">
                    <span className={`badge ${log.transaction_type === 'STOCK_IN' ? 'badge-success' : 'badge-warning'}`}>
                      {log.transaction_type === 'STOCK_IN' ? 'Stock In' : 'Stock Out'}
                    </span>
                  </td>
                  <td data-label="Quantity" className="font-bold text-primary">
                    {log.transaction_type === 'STOCK_IN' ? '+' : '-'}{log.quantity}
                  </td>
                  <td data-label="Remarks" className="text-secondary">{log.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <ModalPortal>
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className={modalMode === 'STOCK_IN' ? 'text-success' : 'text-danger'}>
                {modalMode === 'STOCK_IN' ? <Plus size={18} /> : <Minus size={18} />}
                {modalMode === 'STOCK_IN' ? 'Stock In' : 'Stock Out'}
              </h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Product
                <select
                  value={formData.product_id}
                  onChange={(e) => handleFormChange('product_id', e.target.value)}
                  autoFocus
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock_quantity ?? 0} in stock)
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleFormChange('quantity', e.target.value)}
                  placeholder="0"
                />
              </label>

              <label>
                Remarks
                <textarea
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => handleFormChange('remarks', e.target.value)}
                  placeholder="Optional - e.g. supplier delivery, damaged goods, stock count correction"
                />
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={modalMode === 'STOCK_IN' ? 'btn-primary' : 'btn-danger'}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin" /> Saving…
                    </>
                  ) : modalMode === 'STOCK_IN' ? (
                    'Confirm Stock In'
                  ) : (
                    'Confirm Stock Out'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Inventory;
