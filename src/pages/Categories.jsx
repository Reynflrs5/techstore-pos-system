import { useState, useEffect, useMemo } from 'react';
import { Tags, Search, Plus, Pencil, Trash2, X, Loader2, Package } from 'lucide-react';
import './Categories.css';
import ModalPortal from '../components/ModalPortal';

const API_URL = 'http://localhost:5000/api/categories';

const emptyForm = { name: '', description: '' };

// Deterministic accent color per category, so the same name always
// gets the same swatch — an easy visual anchor when scanning the list.
const swatchColors = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const colorForName = (name = '') => {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return swatchColors[hash % swatchColors.length];
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadCategories = () => {
    setLoading(true);
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name || '', description: cat.description || '' });
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
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // Assumes a REST-style backend: POST to create, PUT /:id to update.
      // Adjust the endpoint/method here if your API differs.
      const res = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Request failed');

      setIsModalOpen(false);
      setToastMessage(editingId ? 'Successfully updated category!' : 'Successfully added category!');
      setTimeout(() => setToastMessage(''), 3000);
      loadCategories();
    } catch (err) {
      setFormError('Could not save the category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    const confirmed = window.confirm(`Delete "${cat.name}"? Products in this category won't be deleted, but they'll lose this label.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      alert('Could not delete the category. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories Management</h1>
          <p className="text-secondary">
            {loading ? 'Loading categories…' : `${filteredCategories.length} of ${categories.length} categories`}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openAddModal}>
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="categories-toolbar">
        <div className="categories-search glass-panel">
          <Search size={18} className="text-secondary" />
          <input
            type="text"
            placeholder="Search categories…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card glass-panel table-container">
        {loading ? (
          <div className="categories-skeleton">
            {[...Array(4)].map((_, i) => (
              <div className="skeleton-row" key={i} />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="empty-state">
            <Tags size={40} className="text-secondary" />
            <p className="text-secondary">
              {categories.length === 0
                ? 'No categories found. Add your first category to start organizing products.'
                : 'No categories match your search.'}
            </p>
            {categories.length === 0 && (
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={16} /> Add Category
              </button>
            )}
          </div>
        ) : (
          <table className="data-table categories-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Products</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => (
                <tr key={cat.id}>
                  <td data-label="Category">
                    <div className="category-name-cell">
                      <span className="tag-dot" style={{ background: colorForName(cat.name) }} />
                      <span className="font-bold">{cat.name}</span>
                    </div>
                  </td>
                  <td data-label="Description" className="text-secondary">
                    {cat.description || <span className="text-muted">No description</span>}
                  </td>
                  <td data-label="Products">
                    <span className="product-count-pill">
                      <Package size={13} />
                      {cat.product_count ?? '—'}
                    </span>
                  </td>
                  <td data-label="Actions" className="actions-col">
                    <button className="icon-btn" onClick={() => openEditModal(cat)} title="Edit" aria-label="Edit category">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(cat)}
                      title="Delete"
                      aria-label="Delete category"
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
          <div className="modal-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Category' : 'Add Category'}</h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Category name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="e.g. Peripherals"
                  autoFocus
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Optional — what belongs in this category?"
                />
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
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
                    'Add Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Categories;