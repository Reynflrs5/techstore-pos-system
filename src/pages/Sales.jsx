import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Search,
  Receipt,
  TrendingUp,
  Percent,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './Sales.css';
import ModalPortal from '../components/ModalPortal';

const API_URL = 'http://localhost:5000/api/sales';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [selectedSale, setSelectedSale] = useState(null);
  const [receiptDetail, setReceiptDetail] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setSales(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const paymentMethods = useMemo(() => {
    const unique = new Set(sales.map((s) => s.payment_method).filter(Boolean));
    return ['all', ...unique];
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesSearch = (s.receipt_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = methodFilter === 'all' || s.payment_method === methodFilter;
      const saleTime = new Date(s.sale_date).getTime();
      const matchesFrom = !dateFrom || saleTime >= new Date(dateFrom).getTime();
      const matchesTo = !dateTo || saleTime <= new Date(dateTo).getTime() + 86400000; // include full "to" day
      return matchesSearch && matchesMethod && matchesFrom && matchesTo;
    });
  }, [sales, searchTerm, methodFilter, dateFrom, dateTo]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, methodFilter, dateFrom, dateTo]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE) || 1;
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const summary = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalDiscount = filteredSales.reduce((sum, s) => sum + Number(s.discount || 0), 0);
    const count = filteredSales.length;
    return {
      totalRevenue,
      totalDiscount,
      count,
      average: count > 0 ? totalRevenue / count : 0,
    };
  }, [filteredSales]);

  // --- Export filtered sales to CSV, entirely client-side ---
  const handleExport = () => {
    const headers = ['Receipt Number', 'Date & Time', 'Payment Method', 'Discount', 'Total'];
    const rows = filteredSales.map((s) => [
      s.receipt_number,
      s.sale_date,
      s.payment_method,
      Number(s.discount).toFixed(2),
      Number(s.total).toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- View / print receipt ---
  const openReceipt = async (sale) => {
    setSelectedSale(sale);
    setReceiptDetail(null);
    setLoadingReceipt(true);
    try {
      // Assumes GET /api/sales/:id returns the full sale including line items.
      // Falls back to the summary row already in the table if this fails.
      const res = await fetch(`${API_URL}/${sale.id}`);
      if (!res.ok) throw new Error('Request failed');
      setReceiptDetail(await res.json());
    } catch (err) {
      setReceiptDetail(sale);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const closeReceipt = () => {
    setSelectedSale(null);
    setReceiptDetail(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="text-secondary">
            {loading ? 'Loading sales…' : `${filteredSales.length} of ${sales.length} transactions`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={filteredSales.length === 0}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      <div className="sales-stats">
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon primary">
            <Receipt size={20} />
          </div>
          <div>
            <h4>{summary.count}</h4>
            <p>Transactions</p>
          </div>
        </div>
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon success">
            <TrendingUp size={20} />
          </div>
          <div>
            <h4>₱{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon warning">
            <Percent size={20} />
          </div>
          <div>
            <h4>₱{summary.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
            <p>Total Discounts</p>
          </div>
        </div>
        <div className="mini-stat glass-panel">
          <div className="mini-stat-icon info">
            <FileText size={20} />
          </div>
          <div>
            <h4>₱{summary.average.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
            <p>Average Sale</p>
          </div>
        </div>
      </div>

      <div className="sales-toolbar">
        <div className="sales-search glass-panel">
          <Search size={18} className="text-secondary" />
          <input
            type="text"
            placeholder="Search by receipt number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="method-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>
              {m === 'all' ? 'All payment methods' : m}
            </option>
          ))}
        </select>
        <div className="date-range">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
          <span className="text-secondary">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
        </div>
      </div>

      <div className="card glass-panel table-container">
        {loading ? (
          <div className="sales-skeleton">
            {[...Array(6)].map((_, i) => (
              <div className="skeleton-row" key={i} />
            ))}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} className="text-secondary" />
            <p className="text-secondary">
              {sales.length === 0 ? 'No sales records found.' : 'No transactions match your filters.'}
            </p>
          </div>
        ) : (
          <>
            <table className="data-table sales-table">
              <thead>
                <tr>
                  <th>Receipt Number</th>
                  <th>Date & Time</th>
                  <th>Payment Method</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSales.map((sale) => (
                  <tr key={sale.id}>
                    <td data-label="Receipt Number" className="font-bold text-primary">{sale.receipt_number}</td>
                    <td data-label="Date & Time" className="text-secondary">{sale.sale_date}</td>
                    <td data-label="Payment Method">
                      <span className="method-pill">{sale.payment_method}</span>
                    </td>
                    <td data-label="Discount" className="text-secondary">₱{Number(sale.discount).toFixed(2)}</td>
                    <td data-label="Total" className="font-bold">₱{Number(sale.total).toFixed(2)}</td>
                    <td data-label="Action" className="actions-col">
                      <button className="icon-btn" title="View Receipt" onClick={() => openReceipt(sale)}>
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem 0' }}>
                <button 
                  className="btn-secondary flex items-center gap-1" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="text-secondary font-bold">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn-secondary flex items-center gap-1" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedSale && (
        <ModalPortal>
        <div className="modal-overlay" onClick={closeReceipt}>
          <div className="modal-panel receipt-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h3>Receipt</h3>
              <button className="icon-btn" onClick={closeReceipt} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {loadingReceipt ? (
              <div className="receipt-loading">
                <Loader2 size={24} className="spin" />
              </div>
            ) : (
              <div className="receipt-content" id="printable-receipt">
                <div className="receipt-brand">
                  <h4>TechStore POS</h4>
                  <p className="text-secondary">Official Receipt</p>
                </div>

                <div className="receipt-meta">
                  <div>
                    <span className="text-secondary">Receipt No.</span>
                    <strong>{receiptDetail?.receipt_number || selectedSale.receipt_number}</strong>
                  </div>
                  <div>
                    <span className="text-secondary">Date</span>
                    <strong>{receiptDetail?.sale_date || selectedSale.sale_date}</strong>
                  </div>
                  <div>
                    <span className="text-secondary">Payment</span>
                    <strong>{receiptDetail?.payment_method || selectedSale.payment_method}</strong>
                  </div>
                </div>

                {Array.isArray(receiptDetail?.items) && receiptDetail.items.length > 0 && (
                  <table className="receipt-items">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptDetail.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.name || item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>₱{Number(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="receipt-totals">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₱{Number(receiptDetail?.subtotal ?? selectedSale.subtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax</span>
                    <span>₱{Number(receiptDetail?.tax ?? selectedSale.tax ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Discount</span>
                    <span>−₱{Number(receiptDetail?.discount ?? selectedSale.discount ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="summary-row total-row">
                    <span>Total</span>
                    <span>₱{Number(receiptDetail?.total ?? selectedSale.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions no-print">
              <button type="button" className="btn-secondary" onClick={closeReceipt}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handlePrint}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Sales;