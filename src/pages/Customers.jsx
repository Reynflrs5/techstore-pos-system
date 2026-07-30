import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Pencil, Trash2, X, Loader2, Phone, Mail } from 'lucide-react';
import './Customers.css';
import ModalPortal from '../components/ModalPortal';

const API_URL = 'http://localhost:5000/api/customers';

const emptyForm = { full_name: '', contact_number: '', email: '', address: '' };

const avatarColors = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const colorForName = (name = '') => {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
};
const initialsForName = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCustomers = () => {
    setLoading(true);
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        (c.contact_number || '').includes(searchTerm) ||
        (c.email || '').toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingId(customer.id);
    setFormData({
      full_name: customer.full_name || '',
      contact_number: customer.contact_number || '',
      email: customer.email || '',
      address: customer.address || '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (formData.contact_number && formData.contact_number.length !== 11) {
      setFormError('Contact number must be exactly 11 digits.');
      return;
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setFormError('Enter a valid email address, or leave it blank.');
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
      loadCustomers();
    } catch (err) {
      setFormError('Could not save the customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(`Delete "${customer.full_name}"? This can't be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    } catch (err) {
      alert('Could not delete the customer. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers Management</h1>
          <p className="text-secondary">
            {loading ? 'Loading customers…' : `${filteredCustomers.length} of ${customers.length} customers`}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openAddModal}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="customers-toolbar">
        <div className="customers-search glass-panel">
          <Search size={18} className="text-secondary" />
          <input
            type="text"
            placeholder="Search by name, contact, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card glass-panel table-container">
        {loading ? (
          <div className="customers-skeleton">
            {[...Array(5)].map((_, i) => (
              <div className="skeleton-row" key={i} />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="text-secondary" />
            <p className="text-secondary">
              {customers.length === 0
                ? 'No customers found. Add your first customer to get started.'
                : 'No customers match your search.'}
            </p>
            {customers.length === 0 && (
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={16} /> Add Customer
              </button>
            )}
          </div>
        ) : (
          <table className="data-table customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Email</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td data-label="Customer">
                    <div className="customer-name-cell">
                      <span className="customer-avatar" style={{ background: colorForName(c.full_name) }}>
                        {initialsForName(c.full_name)}
                      </span>
                      <span className="font-bold">{c.full_name}</span>
                    </div>
                  </td>
                  <td data-label="Contact" className="text-secondary">
                    {c.contact_number ? (
                      <span className="contact-cell">
                        <Phone size={13} /> {c.contact_number}
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td data-label="Email" className="text-secondary">
                    {c.email ? (
                      <span className="contact-cell">
                        <Mail size={13} /> {c.email}
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td data-label="Actions" className="actions-col">
                    <button className="icon-btn" onClick={() => openEditModal(c)} title="Edit" aria-label="Edit customer">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(c)}
                      title="Delete"
                      aria-label="Delete customer"
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
              <h3>{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Full name
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleFormChange('full_name', e.target.value)}
                  placeholder="e.g. Maria Santos"
                  autoFocus
                />
              </label>

              <label>
                Contact number
                <input
                  type="text"
                  value={formData.contact_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 11) {
                      handleFormChange('contact_number', val);
                    }
                  }}
                  placeholder="e.g. 09171234567"
                  maxLength={11}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="e.g. maria@email.com"
                />
              </label>

              <label>
                Address
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  placeholder="Optional"
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
                    'Add Customer'
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

export default Customers;