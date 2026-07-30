import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  ImagePlus,
  Barcode,
} from 'lucide-react';
import './Products.css';
import ModalPortal from '../components/ModalPortal';

const API_URL = 'http://localhost:5000/api/products';

// Empty form used both for "Add Product" and reset after submit.
const emptyForm = { name: '', barcode: '', category: '', price: '', stock_quantity: '', image_url: '' };

const Products = () => {
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadProducts = () => {
    setLoading(true);
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Fetch actual categories from database
    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data))
      .catch(err => console.error(err));
      
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(dbCategories.map(c => c.name));
    products.forEach((p) => { if (p.category) unique.add(p.category) });
    return ['all', ...Array.from(unique)];
  }, [products, dbCategories]);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode || '').includes(searchTerm);
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === 'asc' ? 1 : -1;
      const valA = a[key];
      const valB = b[key];
      if (typeof valA === 'number' || typeof valB === 'number') {
        return (Number(valA) - Number(valB)) * dir;
      }
      return String(valA).localeCompare(String(valB)) * dir;
    });

    return result;
  }, [products, searchTerm, categoryFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="sort-icon" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="sort-icon active" />
    ) : (
      <ArrowDown size={14} className="sort-icon active" />
    );
  };

  const stockTier = (qty) => {
    if (qty <= 0) return 'badge-danger';
    if (qty < 10) return 'badge-warning';
    return 'badge-success';
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      price: product.price ?? '',
      stock_quantity: product.stock_quantity ?? '',
      image_url: product.image_url || '',
    });
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateBarcode = () => {
    // Generate a random 13-digit number for barcode
    const randomBarcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
    handleFormChange('barcode', randomBarcode.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.barcode.trim()) {
      setFormError('Name and barcode are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      ...formData,
      price: Number(formData.price) || 0,
      stock_quantity: Number(formData.stock_quantity) || 0,
    };

    try {
      // Assumes a REST-style backend: POST to create, PUT /:id to update.
      // Adjust the endpoint/method here if your API differs.
      const res = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Request failed');

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      setFormError('Could not save the product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Delete "${product.name}"? This can't be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      alert('Could not delete the product. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products Management</h1>
          <p className="text-secondary">
            {loading ? 'Loading products…' : `${filteredProducts.length} of ${products.length} products`}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openAddModal}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="products-toolbar">
        <div className="products-search glass-panel">
          <Search size={18} className="text-secondary" />
          <input
            type="text"
            placeholder="Search by name or barcode…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All categories' : c}
            </option>
          ))}
        </select>
      </div>

      {/* Stock Legend */}
      <div className="stock-legend mb-4" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
          <span>Sufficient Stock (10+)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }}></span>
          <span>Low Stock (&lt; 10)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }}></span>
          <span>Out of Stock (0)</span>
        </div>
      </div>

      <div className="card glass-panel table-container">
        {loading ? (
          <div className="products-skeleton">
            {[...Array(5)].map((_, i) => (
              <div className="skeleton-row" key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <Package size={40} className="text-secondary" />
            <p className="text-secondary">
              {products.length === 0
                ? 'No products found. Add your first product to get started.'
                : 'No products match your search or filter.'}
            </p>
            {products.length === 0 && (
              <button className="btn-primary flex items-center gap-2" onClick={openAddModal}>
                <Plus size={16} /> Add Product
              </button>
            )}
          </div>
        ) : (
          <table className="data-table products-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('barcode')}>Barcode {sortIcon('barcode')}</th>
                <th onClick={() => handleSort('name')}>Name {sortIcon('name')}</th>
                <th>Category</th>
                <th onClick={() => handleSort('price')}>Price {sortIcon('price')}</th>
                <th onClick={() => handleSort('stock_quantity')}>Stock {sortIcon('stock_quantity')}</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td data-label="Barcode" className="text-secondary">{p.barcode}</td>
                  <td data-label="Name" className="font-bold">{p.name}</td>
                  <td data-label="Category">
                    {p.category ? <span className="category-pill">{p.category}</span> : '—'}
                  </td>
                  <td data-label="Price" className="text-primary">₱{Number(p.price).toFixed(2)}</td>
                  <td data-label="Stock">
                    <span className={`badge ${stockTier(p.stock_quantity)}`}>
                      {p.stock_quantity <= 0 ? 'Out of stock' : p.stock_quantity}
                    </span>
                  </td>
                  <td data-label="Actions" className="actions-col">
                    <button className="icon-btn" onClick={() => openEditModal(p)} aria-label="Edit product">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(p)}
                      aria-label="Delete product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <ModalPortal>
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel glass-panel product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Product' : 'Add Product'}</h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="product-landscape-form">
              {/* Left Column: Image Upload */}
              <div className="product-form-left">
                <label className="image-upload-wrapper">
                  <span className="upload-label">Product Image</span>
                  <div className="image-upload-box">
                    {formData.image_url ? (
                      <div className="uploaded-image-preview">
                        <img src={formData.image_url} alt="Preview" />
                        <div className="upload-overlay">
                          <ImagePlus size={24} />
                          <span>Change Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-upload-box">
                        <ImagePlus size={32} className="text-secondary mb-2" />
                        <span className="text-secondary font-medium">Click to upload</span>
                        <span className="text-secondary text-xs mt-1">PNG, JPG, JPEG</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden-file-input"
                    />
                  </div>
                </label>
              </div>

              {/* Right Column: Form Fields */}
              <div className="product-form-right">
                <label>
                  Name
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="e.g. Wireless Mouse"
                    autoFocus
                  />
                </label>

                <label>
                  Barcode
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => handleFormChange('barcode', e.target.value)}
                      placeholder="e.g. 4801234567890"
                      style={{ flex: 1, width: '100%' }}
                    />
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={generateBarcode}
                      style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Auto-Generate Barcode"
                    >
                      <Barcode size={18} />
                    </button>
                  </div>
                </label>

                <label>
                  Category
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-color-light)', color: 'var(--text-primary)', marginTop: '0.25rem' }}
                  >
                    <option value="" disabled>Select a Category</option>
                    {dbCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {/* Fallback for old categories not in DB */}
                    {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => {
                      if (!dbCategories.find(c => c.name === cat)) {
                        return <option key={cat} value={cat}>{cat}</option>
                      }
                      return null;
                    })}
                  </select>
                </label>

                <div className="modal-form-row">
                  <label>
                    Price (₱)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleFormChange('price', e.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                  <label>
                    Stock quantity
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => handleFormChange('stock_quantity', e.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>

                {formError && <p className="form-error">{formError}</p>}

                <div className="modal-actions mt-auto">
                  <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spin" /> Saving…
                      </>
                    ) : editingId ? (
                      'Save Changes'
                    ) : (
                      'Add Product'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Products;