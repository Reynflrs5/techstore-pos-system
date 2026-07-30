import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, Barcode, Package, X, PauseCircle, Clock, Loader2, User, NotebookPen, ChevronUp, Tag, AlertTriangle, ScanLine, Info, TrendingUp, History, CheckCircle2 } from 'lucide-react';
import './POS.css';
import ModalPortal from '../components/ModalPortal';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);

  // New states for the features
  const [activeCategory, setActiveCategory] = useState('All');
  const [heldOrders, setHeldOrders] = useState([]);

  // Payment Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [referenceNumber, setReferenceNumber] = useState(''); // Feature 8
  const [splitCash, setSplitCash] = useState(''); // Feature 6
  const [splitNonCash, setSplitNonCash] = useState(''); // Feature 6
  const [splitNonCashMethod, setSplitNonCashMethod] = useState('GCash'); // GCash or Card for split

  // Receipt Modal states
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptAnimating, setReceiptAnimating] = useState(false); // NEW: drives the "printing" animation
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState(''); // Feature 9
  const [isSendingDigital, setIsSendingDigital] = useState(false); // Feature 9
  const [noteOpenId, setNoteOpenId] = useState(null); // tracks which cart item note is expanded
  const [discountOpenId, setDiscountOpenId] = useState(null); // tracks which cart item discount panel is open
  const [scannerActive, setScannerActive] = useState(false); // Feature #4: barcode scanner mode

  // Features 12, 13, 14 states
  const [dailySales, setDailySales] = useState({ total: 0, count: 0 }); // Feature 12
  const [quickViewProduct, setQuickViewProduct] = useState(null); // Feature 13
  const [activeSidebarTab, setActiveSidebarTab] = useState('cart'); // Feature 14 ('cart' | 'recent')
  const [recentTransactions, setRecentTransactions] = useState([]); // Feature 14
  const [selectedVariants, setSelectedVariants] = useState({}); // tracks per-product variant selections
  const [productVariants, setProductVariants] = useState([]); // fetched from backend
  const [loadingVariants, setLoadingVariants] = useState(false);
  // Feature #4: barcode scanner — hardware scanners type fast and end with Enter
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    const fetchSalesData = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/sales');
        if (res.ok) {
          const data = await res.json();
          // Mock recent transactions using the fetched data or fallback
          const recent = data.slice(0, 5);
          setRecentTransactions(recent);

          // Mock daily stats (assuming all fetched are today for demo, or calculate if date exists)
          const todayTotal = data.reduce((sum, sale) => sum + Number(sale.total), 0);
          setDailySales({ total: todayTotal, count: data.length });
        }
      } catch (err) {
        console.error("Failed to fetch sales:", err);
      }
    };

    fetchProducts();
    fetchSalesData();
  }, []);

  useEffect(() => {
    if (!quickViewProduct) {
      setProductVariants([]);
      return;
    }
    const fetchVariants = async () => {
      setLoadingVariants(true);
      try {
        const res = await fetch(`http://localhost:5000/api/products/${quickViewProduct.id}/variants`);
        if (res.ok) {
          const data = await res.json();
          setProductVariants(data);
        }
      } catch (err) {
        console.error('Failed to fetch variants', err);
      } finally {
        setLoadingVariants(false);
      }
    };
    fetchVariants();
  }, [quickViewProduct]);

  // NEW: trigger the receipt "printing out" animation whenever the receipt modal opens
  useEffect(() => {
    if (showReceiptModal) {
      setReceiptAnimating(true);
      const t = setTimeout(() => setReceiptAnimating(false), 3100);
      return () => clearTimeout(t);
    }
  }, [showReceiptModal]);

  // Feature #4: Barcode scanner keyboard listener
  useEffect(() => {
    if (!scannerActive) return;
    const handleKeyDown = (e) => {
      // Ignore modifier-only keys
      if (e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control' || e.key === 'Meta') return;

      if (e.key === 'Enter') {
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        if (!barcode) return;

        const matched = products.find(
          p => p.barcode && p.barcode.trim() === barcode
        );
        if (matched) {
          const stock = matched.stock_quantity ?? matched.stock ?? 0;
          if (stock <= 0) {
            setToastMessage(`⚠ ${matched.name} is out of stock!`);
          } else {
            addToCart(matched);
            setToastMessage(`✔ ${matched.name} scanned & added!`);
          }
          setTimeout(() => setToastMessage(''), 2500);
        } else {
          setToastMessage(`⚠ Barcode "${barcode}" not found.`);
          setTimeout(() => setToastMessage(''), 2500);
        }
        return;
      }

      // Accumulate characters; reset buffer if gap > 100ms (human typing)
      barcodeBufferRef.current += e.key;
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
      barcodeTimerRef.current = setTimeout(() => {
        barcodeBufferRef.current = '';
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerActive, products]);

  const categories = useMemo(() => {
    const unique = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...unique];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = useCallback((product, variantNote = '') => {
    const stock = product.stock_quantity ?? product.stock ?? 0;
    const inCart = cart.find(item => item.id === product.id);
    const currentQty = inCart ? inCart.quantity : 0;
    // Prevent adding beyond available stock
    if (currentQty >= stock) return;
    if (inCart) {
      setCart(prev => prev.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart(prev => [...prev, { ...product, quantity: 1, note: variantNote, itemDiscount: 0, itemDiscountType: '%', basePrice: product.basePrice ?? product.price, variantUpgrade: product.variantUpgrade ?? 0 }]);
    }
  }, [cart]);

  const updateQuantity = (id, change) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const updateNote = (id, note) => {
    setCart(cart.map(item => item.id === id ? { ...item, note } : item));
  };

  const updateItemDiscount = (id, field, value) => {
    setCart(cart.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Helper: calculate effective price for a single cart item after its own discount
  const getItemEffectiveTotal = (item) => {
    const base = item.price * item.quantity;
    if (!item.itemDiscount || item.itemDiscount <= 0) return base;
    if (item.itemDiscountType === '%') {
      const pct = Math.min(item.itemDiscount, 100);
      return base - (base * pct / 100);
    }
    return Math.max(0, base - item.itemDiscount);
  };

  const getItemDiscountAmount = (item) => {
    const base = item.price * item.quantity;
    return base - getItemEffectiveTotal(item);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemEffectiveTotal(item), 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax - discount;
  const changeDue = Number(amountTendered) > 0 ? Number(amountTendered) - total : 0;

  // Split payment change logic
  const splitTotalEntered = Number(splitCash) + Number(splitNonCash);
  const splitChangeDue = splitTotalEntered > 0 ? splitTotalEntered - total : 0;

  // Feature: Hold Order
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      discount,
      customerName
    };
    setHeldOrders([...heldOrders, newHold]);
    setCart([]);
    setDiscount(0);
    setCustomerName('');
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear the current order?')) {
      setCart([]);
      setDiscount(0);
      setCustomerName('');
    }
  };

  const restoreOrder = (orderId) => {
    const orderToRestore = heldOrders.find(h => h.id === orderId);
    if (orderToRestore) {
      if (cart.length > 0) handleHoldOrder(); // hold current if exists
      setCart(orderToRestore.cart);
      setDiscount(orderToRestore.discount);
      setCustomerName(orderToRestore.customerName || '');
      setHeldOrders(heldOrders.filter(h => h.id !== orderId));
    }
  };

  // Feature: Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Cash' && Number(amountTendered) < total) {
      alert('Tendered amount is less than total!');
      return;
    }
    if (paymentMethod === 'Split' && splitTotalEntered < total) {
      alert('Total split amount is less than total due!');
      return;
    }

    const finalPaymentMethod = paymentMethod === 'Split' ? `Split (Cash+${splitNonCashMethod})` : paymentMethod;
    const finalAmountPaid = paymentMethod === 'Cash' ? Number(amountTendered) :
      paymentMethod === 'Split' ? splitTotalEntered : total;
    const finalChangeAmount = paymentMethod === 'Cash' ? changeDue :
      paymentMethod === 'Split' ? splitChangeDue : 0;

    const saleData = {
      user_id: 1,
      customer_name: customerName,
      subtotal,
      tax,
      discount,
      total,
      payment_method: finalPaymentMethod,
      amount_paid: finalAmountPaid,
      change_amount: finalChangeAmount,
      reference_number: referenceNumber,
      items: cart
    };

    try {
      const response = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      const data = await response.json();
      if (data.success) {
        const receipt = {
          receiptNumber: data.receipt_number || `REC-${Date.now()}`,
          date: new Date().toLocaleString(),
          items: [...cart],
          subtotal,
          tax,
          discount,
          total,
          paymentMethod: finalPaymentMethod,
          amountPaid: finalAmountPaid,
          change: finalChangeAmount,
          customerName,
          referenceNumber,
          splitCash: paymentMethod === 'Split' ? Number(splitCash) : 0,
          splitNonCash: paymentMethod === 'Split' ? Number(splitNonCash) : 0,
          splitNonCashMethod
        };
        setReceiptData(receipt);
        setShowReceiptModal(true);

        setCart([]);
        setDiscount(0);
        setCustomerName('');
        setShowPaymentModal(false);
        setAmountTendered('');
        setPaymentMethod('Cash');
        setReferenceNumber('');
        setSplitCash('');
        setSplitNonCash('');

        // Refresh products and sales data
        const res = await fetch('http://localhost:5000/api/products');
        setProducts(await res.json());

        try {
          const salesRes = await fetch('http://localhost:5000/api/sales');
          if (salesRes.ok) {
            const salesData = await salesRes.json();
            setRecentTransactions(salesData.slice(0, 5));
            const todayTotal = salesData.reduce((sum, sale) => sum + Number(sale.total), 0);
            setDailySales({ total: todayTotal, count: salesData.length });
          }
        } catch (e) { console.error(e); }

      } else {
        alert('Checkout failed!');
      }
    } catch (error) {
      alert('Cannot connect to server during checkout.');
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);

    // Simulate generation time for UX
    await new Promise(resolve => setTimeout(resolve, 800));

    window.print();
    setIsPrinting(false);
  };

  const handleConfirmToContinue = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      setShowReceiptModal(false);
      setToastMessage('Payment successful!');
      setTimeout(() => setToastMessage(''), 3000);
    }, 600);
  };

  const handleSendDigital = () => {
    if (!customerContact) {
      setToastMessage('Please enter email or phone number first.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    setIsSendingDigital(true);
    setTimeout(() => {
      setIsSendingDigital(false);
      setToastMessage(`Receipt sent to ${customerContact}!`);
      setShowReceiptModal(false);
      setTimeout(() => setToastMessage(''), 3000);
    }, 1500);
  };

  return (
    <div className="pos-container animate-fade-in">
      <div className="pos-main">
        {/* Daily Sales Ticker (Feature 12) */}
        <div className="daily-sales-ticker glass-panel mb-2 flex items-center justify-between px-4 py-2" style={{ borderRadius: '10px' }}>
          <div className="flex items-center gap-2 text-primary font-bold">
            <TrendingUp size={18} /> Today's Performance
          </div>
          <div className="flex gap-6 text-sm font-semibold">
            <span>Transactions: <span className="text-secondary">{dailySales.count}</span></span>
            <span>Total Sales: <span className="text-success">₱{dailySales.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          </div>
        </div>

        {/* Top Header & Search */}
        <div className="pos-toolbar glass-panel">
          <div className="search-input-wrapper flex-1">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search product name or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pos-search-input"
            />
            <button
              className={`btn-icon barcode-btn ${scannerActive ? 'scanner-on' : ''}`}
              title={scannerActive ? 'Scanner Active — click to disable' : 'Enable Barcode Scanner'}
              onClick={() => setScannerActive(v => !v)}
            >
              {scannerActive ? <ScanLine size={20} /> : <Barcode size={20} />}
            </button>
          </div>

          {/* Held Orders Quick Access */}
          {heldOrders.length > 0 && (
            <div className="held-orders-badges">
              {heldOrders.map(ho => (
                <button key={ho.id} className="held-badge btn-secondary" onClick={() => restoreOrder(ho.id)}>
                  <Clock size={14} /> Hold ({ho.time})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scanner mode banner */}
        {scannerActive && (
          <div className="scanner-banner">
            <ScanLine size={16} className="scanner-pulse" />
            Scanner Mode Active — scan a barcode to add item to cart
            <button className="scanner-dismiss" onClick={() => setScannerActive(false)}>✕</button>
          </div>
        )}

        {/* Categories Pills */}
        <div className="categories-pills">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="products-grid">
          {filteredProducts.map(product => {

            // Match to local asset images by product name
            let imgUrl = new URL('../../assets/images/Gaming Laptop RTX 4060.jpe', import.meta.url).href; // default fallback
            const cat = String(product.category || '').toLowerCase();
            const name = String(product.name || '').toLowerCase();

            if (name.includes('gaming laptop') || (name.includes('laptop') && name.includes('rtx'))) {
              imgUrl = new URL('../../assets/images/Gaming Laptop RTX 4060.jpe', import.meta.url).href;
            } else if (name.includes('office laptop') || (name.includes('laptop') && name.includes('i5'))) {
              imgUrl = new URL('../../assets/images/Office Laptop i5.jpe', import.meta.url).href;
            } else if (cat.includes('laptop') || name.includes('laptop')) {
              imgUrl = new URL('../../assets/images/Office Laptop i5.jpe', import.meta.url).href;
            } else if (name.includes('gaming mouse')) {
              imgUrl = new URL('../../assets/images/Gaming Mouse.png', import.meta.url).href;
            } else if (name.includes('wireless mouse')) {
              imgUrl = new URL('../../assets/images/Wireless Mouse Pro.png', import.meta.url).href;
            } else if (cat.includes('mouse') || name.includes('mouse')) {
              imgUrl = new URL('../../assets/images/Gaming Mouse.png', import.meta.url).href;
            } else if (name.includes('keyboard')) {
              imgUrl = new URL('../../assets/images/Mechanical Keyboard Blue Switch.jpe', import.meta.url).href;
            } else if (name.includes('hdd') || name.includes('hard drive')) {
              imgUrl = new URL('../../assets/images/HDD 1TB.jpe', import.meta.url).href;
            } else if (name.includes('ssd') || name.includes('nvme')) {
              imgUrl = new URL('../../assets/images/SSD 512GB NVMe.png', import.meta.url).href;
            } else if (name.includes('ram') || name.includes('ddr') || name.includes('memory')) {
              imgUrl = new URL('../../assets/images/RAM 16GB DDR4.png', import.meta.url).href;
            }

            // Prefer database image_url (now updated with local paths), fallback to matched local asset
            const finalImage = product.image_url || imgUrl;

            const stockQty = product.stock_quantity ?? product.stock ?? 0;
            return (
              <div
                key={product.id}
                className={`product-card glass-panel ${stockQty === 0 ? 'product-card-oos' : ''}`}
                style={{ position: 'relative' }}
              >
                <div className="product-image-container" onClick={() => stockQty > 0 && setQuickViewProduct({ ...product, finalImage })}>
                  <img src={finalImage} alt={product.name} className="product-img" />
                </div>

                {/* Feature 13: Quick-view info button */}
                <button
                  className="quick-view-btn"
                  onClick={(e) => { e.stopPropagation(); setQuickViewProduct({ ...product, finalImage }); }}
                  title="View Details"
                >
                  <Info size={16} />
                </button>

                <div className="product-info" onClick={() => stockQty > 0 && setQuickViewProduct({ ...product, finalImage })}>
                  <h4>{product.name}</h4>
                  <p className="category">{product.category}</p>
                  <div className="price-stock">
                    <span className="price">₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {(() => {
                      const qty = product.stock_quantity ?? product.stock ?? 0;
                      if (qty === 0) return <span className="stock stock-out">Out of Stock</span>;
                      if (qty <= 5) return <span className="stock stock-low"><AlertTriangle size={11} /> {qty} left</span>;
                      return <span className="stock">{qty} in stock</span>;
                    })()}
                  </div>
                </div>
                {/* Out-of-stock overlay */}
                {(product.stock_quantity ?? product.stock ?? 0) === 0 && (
                  <div className="product-oos-overlay">
                    <span>Out of Stock</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pos-sidebar glass-panel">
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeSidebarTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveSidebarTab('cart')}
          >
            <ShoppingCart size={16} /> Current Order
          </button>
          <button
            className={`sidebar-tab ${activeSidebarTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveSidebarTab('recent')}
          >
            <History size={16} /> Recent Sales
          </button>
        </div>

        {activeSidebarTab === 'cart' ? (
          <>
            <div className="cart-header">
              <h3><ShoppingCart size={20} /> Cart Items</h3>
              <div className="flex gap-2 items-center">
                <button
                  className="btn-icon text-warning"
                  title="Hold Order"
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0}
                >
                  <PauseCircle size={20} />
                </button>
                <button
                  className="btn-icon text-danger"
                  title="Clear Cart"
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                >
                  <Trash2 size={20} />
                </button>
                <span className="item-count">{cart.length} items</span>
              </div>
            </div>

            {/* Customer Assignment */}
            <div className="customer-assignment">
              <div className="customer-input-wrapper">
                <User size={16} className="text-secondary" />
                <input
                  type="text"
                  placeholder="Assign Customer Name (Optional)"
                  className="customer-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart text-secondary">
                  <ShoppingCart size={48} />
                  <p>No items in cart</p>
                </div>
              ) : (
                cart.map(item => {
                  const itemDiscAmt = getItemDiscountAmount(item);
                  const effectiveTotal = getItemEffectiveTotal(item);
                  return (
                    <div key={item.id} className="cart-item">
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <div className="item-price-col">
                          {itemDiscAmt > 0 && (
                            <span className="item-original-price">₱{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                          <span className="item-price">₱{effectiveTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="item-actions">
                        <div className="qty-controls">
                          <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={14} /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn"><Plus size={14} /></button>
                        </div>
                        <div className="item-right-actions">
                          {/* Discount toggle */}
                          <button
                            className={`note-toggle-btn ${discountOpenId === item.id ? 'active' : ''} ${item.itemDiscount > 0 ? 'has-item-discount' : ''}`}
                            title={item.itemDiscount > 0 ? 'Edit item discount' : 'Add item discount'}
                            onClick={() => {
                              setDiscountOpenId(discountOpenId === item.id ? null : item.id);
                              setNoteOpenId(null);
                            }}
                          >
                            {discountOpenId === item.id ? <ChevronUp size={15} /> : <Tag size={15} />}
                          </button>
                          {/* Note toggle */}
                          <button
                            className={`note-toggle-btn ${noteOpenId === item.id ? 'active' : ''} ${item.note ? 'has-note' : ''}`}
                            title={item.note ? 'View/Edit note' : 'Add note'}
                            onClick={() => {
                              setNoteOpenId(noteOpenId === item.id ? null : item.id);
                              setDiscountOpenId(null);
                            }}
                          >
                            {noteOpenId === item.id ? <ChevronUp size={15} /> : <NotebookPen size={15} />}
                          </button>
                          <button onClick={() => removeFromCart(item.id)} className="remove-btn text-danger">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Discount Panel */}
                      {discountOpenId === item.id && (
                        <div className="item-note-area">
                          <div className="item-discount-panel">
                            <div className="item-discount-type-toggle">
                              <button
                                className={`disc-type-btn ${item.itemDiscountType === '%' ? 'active' : ''}`}
                                onClick={() => updateItemDiscount(item.id, 'itemDiscountType', '%')}
                              >%</button>
                              <button
                                className={`disc-type-btn ${item.itemDiscountType === '₱' ? 'active' : ''}`}
                                onClick={() => updateItemDiscount(item.id, 'itemDiscountType', '₱')}
                              >₱</button>
                            </div>
                            <div className="item-discount-input-wrapper">
                              <span className="item-disc-symbol">
                                {item.itemDiscountType === '%' ? '%' : '₱'}
                              </span>
                              <input
                                type="number"
                                className="item-discount-input"
                                placeholder={item.itemDiscountType === '%' ? '0' : '0.00'}
                                value={item.itemDiscount || ''}
                                min={0}
                                max={item.itemDiscountType === '%' ? 100 : undefined}
                                onChange={(e) => updateItemDiscount(item.id, 'itemDiscount', Number(e.target.value))}
                                autoFocus
                              />
                            </div>
                            {itemDiscAmt > 0 && (
                              <span className="item-disc-saving">Save ₱{itemDiscAmt.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Inline Note Input */}
                      {noteOpenId === item.id && (
                        <div className="item-note-area">
                          <textarea
                            className="item-note-input"
                            placeholder="Add a note (e.g. gift wrap, check serial no.)…"
                            value={item.note || ''}
                            onChange={(e) => updateNote(item.id, e.target.value)}
                            rows={2}
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Badges row: discount + note previews */}
                      <div className="item-badges-row">
                        {item.itemDiscount > 0 && discountOpenId !== item.id && (
                          <span className="item-discount-badge">
                            <Tag size={10} />
                            {item.itemDiscountType === '%' ? `${item.itemDiscount}% off` : `₱${Number(item.itemDiscount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} off`}
                          </span>
                        )}
                        {item.note && noteOpenId !== item.id && (
                          <p className="item-note-preview">
                            <NotebookPen size={11} /> {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row">
                <span>Tax (10%)</span>
                <span>₱{tax.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row discount-row">
                <span>Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="discount-input"
                  min="0"
                />
              </div>
              <div className="summary-row total-row">
                <span>Total</span>
                <span className="text-primary font-bold">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                  disabled={cart.length === 0}
                  onClick={() => setShowPaymentModal(true)}
                >
                  <CreditCard size={18} /> Process Payment
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Feature 14: Recent Sales Tab */
          <div className="recent-sales-tab">
            <div className="recent-sales-header">
              <h3><History size={18} /> Last 5 Transactions</h3>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="empty-state">
                <History size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                <p>No recent sales found.</p>
              </div>
            ) : (
              <div className="recent-tx-list">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="recent-tx-card glass-panel">
                    <div className="tx-card-top">
                      <span className="tx-receipt-no">#{tx.receipt_number || tx.id}</span>
                      <span className="tx-time"><Clock size={12} /> {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="tx-card-bottom">
                      <span className={`tx-method tx-method-${tx.payment_method.split(' ')[0].toLowerCase()}`}>
                        {tx.payment_method}
                      </span>
                      <span className="tx-total">₱{Number(tx.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Variant & Detail Modal */}
      {quickViewProduct && (() => {
        const vid = quickViewProduct.id;
        const sel = selectedVariants[vid] || {};

        const setSel = (key, val) => setSelectedVariants(prev => ({ ...prev, [vid]: { ...(prev[vid] || {}), [key]: val } }));

        // Group variants from backend by type
        const groupedVariants = productVariants.reduce((acc, v) => {
          if (!acc[v.type]) acc[v.type] = [];
          acc[v.type].push(v);
          return acc;
        }, {});

        const colorOptions = groupedVariants['color'] || null;
        const STORAGES = groupedVariants['storage'] || null;  // full variant objects
        const RAMS = groupedVariants['ram'] || null;          // full variant objects
        const SWITCHES = groupedVariants['switch'] || null;   // full variant objects

        const buildVariantNote = () => {
          const parts = [];
          if (sel.color) parts.push(`Color: ${sel.color}`);
          if (sel.storage) parts.push(`Storage: ${sel.storage}`);
          if (sel.ram) parts.push(`RAM: ${sel.ram}`);
          if (sel.switch) parts.push(`Switch: ${sel.switch}`);
          return parts.join(' | ');
        };

        // Helper: get price modifier for a selected variant type+label
        const getVariantModifier = (type, label) => {
          const v = productVariants.find(v => v.type === type && v.label === label);
          return v && Number(v.price_modifier) > 0 ? Number(v.price_modifier) : 0;
        };

        // Compute total price modifier from all current selections
        const totalSelectedModifier = Object.entries(sel).reduce((sum, [type, label]) => {
          return sum + getVariantModifier(type, label);
        }, 0);

        const displayPrice = Number(quickViewProduct.price) + totalSelectedModifier;

        const handleAddToCart = () => {
          const variantNote = buildVariantNote();
          const productToAdd = {
            ...quickViewProduct,
            price: displayPrice,
            basePrice: Number(quickViewProduct.price),
            variantUpgrade: totalSelectedModifier,
          };
          addToCart(productToAdd, variantNote);
          setQuickViewProduct(null);
        };

        const stockQty = quickViewProduct.stock_quantity ?? quickViewProduct.stock ?? 0;

        return (
          <ModalPortal>
            <div className="modal-overlay" onClick={() => setQuickViewProduct(null)}>
              <div className="modal-panel glass-panel product-detail-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{quickViewProduct.category}</p>
                    <h3 style={{ margin: 0 }}>{quickViewProduct.name}</h3>
                  </div>
                  <button className="icon-btn" onClick={() => setQuickViewProduct(null)}><X size={20} /></button>
                </div>

                <div className="product-detail-body">
                  {/* Left: image */}
                  <div className="product-detail-img-col">
                    <div className="product-detail-img-wrap">
                      <img src={quickViewProduct.finalImage} alt={quickViewProduct.name} />
                    </div>
                    <div className="product-detail-meta">
                      <div>
                        <span className="meta-label">Price</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="meta-value text-primary" style={{ fontSize: '1.4rem', fontWeight: 800 }}>₱{displayPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {totalSelectedModifier > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-success, #10B981)', fontWeight: 600 }}>
                              Base ₱{Number(quickViewProduct.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + ₱{totalSelectedModifier.toLocaleString()} upgrade
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="meta-label">Stock</span>
                        <span className="meta-value">{stockQty} units</span>
                      </div>
                      <div>
                        <span className="meta-label">Barcode</span>
                        <span className="meta-value" style={{ fontFamily: 'var(--pos-mono)', fontSize: '0.8rem' }}>{quickViewProduct.barcode || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: variants */}
                  <div className="product-detail-options-col">
                    {/* Color picker */}
                    {colorOptions && (
                      <div className="variant-section">
                        <label className="variant-label">Color {sel.color && <span className="variant-selected-tag">{sel.color}</span>}</label>
                        <div className="color-swatches">
                          {colorOptions.map(c => (
                            <button
                              key={c.label}
                              className={`color-swatch ${sel.color === c.label ? 'active' : ''}`}
                              style={{ '--swatch-color': c.meta || '#ccc' }}
                              title={c.label}
                              onClick={() => setSel('color', c.label)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Switch picker (keyboard) */}
                    {SWITCHES && (
                      <div className="variant-section">
                        <label className="variant-label">Switch Type</label>
                        <div className="variant-chips">
                          {SWITCHES.map(v => {
                            const mod = Number(v.price_modifier) || 0;
                            return (
                              <button key={v.label} className={`variant-chip ${sel.switch === v.label ? 'active' : ''}`} onClick={() => setSel('switch', v.label)}>
                                {v.label}
                                {mod > 0 && <span className="variant-chip-price">+₱{mod.toLocaleString()}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Storage picker */}
                    {STORAGES && (
                      <div className="variant-section">
                        <label className="variant-label">Storage</label>
                        <div className="variant-chips">
                          {STORAGES.map(v => {
                            const mod = Number(v.price_modifier) || 0;
                            return (
                              <button key={v.label} className={`variant-chip ${sel.storage === v.label ? 'active' : ''}`} onClick={() => setSel('storage', v.label)}>
                                {v.label}
                                {mod > 0 && <span className="variant-chip-price">+₱{mod.toLocaleString()}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* RAM picker */}
                    {RAMS && (
                      <div className="variant-section">
                        <label className="variant-label">RAM</label>
                        <div className="variant-chips">
                          {RAMS.map(v => {
                            const mod = Number(v.price_modifier) || 0;
                            return (
                              <button key={v.label} className={`variant-chip ${sel.ram === v.label ? 'active' : ''}`} onClick={() => setSel('ram', v.label)}>
                                {v.label}
                                {mod > 0 && <span className="variant-chip-price">+₱{mod.toLocaleString()}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {quickViewProduct.description && (
                      <div className="variant-section">
                        <label className="variant-label">Description</label>
                        <p style={{ fontSize: '0.82rem', color: 'var(--ink-text-secondary)', margin: 0, lineHeight: 1.6 }}>{quickViewProduct.description}</p>
                      </div>
                    )}

                    {/* Variant summary */}
                    {buildVariantNote() && (
                      <div className="variant-summary">
                        <span>Selected: </span><strong>{buildVariantNote()}</strong>
                      </div>
                    )}

                    <button
                      className="btn-primary w-full flex justify-center items-center gap-2"
                      style={{ marginTop: 'auto', padding: '0.9rem' }}
                      disabled={stockQty === 0}
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart size={18} />
                      {stockQty === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* Payment Modal */}
      {showPaymentModal && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-panel payment-modal glass-panel">
              <div className="modal-header">
                <h3>Process Payment</h3>
                <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="payment-landscape-layout">
                {/* Left Column: Summary */}
                <div className="payment-left-col">
                  <div className="payment-total text-center">
                    <p className="text-secondary mb-1">Total Amount Due</p>
                    <h2 className="text-primary" style={{ fontSize: '2.8rem', margin: 0, fontWeight: 800, lineHeight: 1 }}>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                  </div>

                  <div className="payment-summary-list mt-4">
                    {/* Per-item breakdown */}
                    <div className="payment-items-breakdown">
                      {cart.map(item => {
                        const base = Number(item.basePrice ?? item.price);
                        const upgrade = Number(item.variantUpgrade ?? 0);
                        const effectiveUnit = base + upgrade;
                        const discAmt = getItemDiscountAmount(item);
                        return (
                          <div key={item.id} className="payment-item-row">
                            <div className="payment-item-name">
                              <span>{item.name}</span>
                              {item.quantity > 1 && <span className="payment-item-qty">×{item.quantity}</span>}
                            </div>
                            <div className="payment-item-prices">
                              <span className="payment-item-unit">₱{base.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                              {upgrade > 0 && (
                                <span className="payment-item-upgrade">+₱{upgrade.toLocaleString('en-PH', { minimumFractionDigits: 2 })} upgrade</span>
                              )}
                              {discAmt > 0 && (
                                <span className="payment-item-disc">-₱{discAmt.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} disc</span>
                              )}
                              <span className="payment-item-total">= ₱{getItemEffectiveTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mb-2" style={{ borderTop: '1px dashed var(--ink-border)', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
                      <span className="text-secondary">Subtotal</span>
                      <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-secondary">Tax (10%)</span>
                      <span>₱{tax.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {totalItemDiscounts > 0 && (
                      <div className="flex justify-between mb-2" style={{ color: '#F59E0B' }}>
                        <span>Item Discounts</span>
                        <span>-₱{totalItemDiscounts.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between mb-2 text-warning">
                        <span>Order Discount</span>
                        <span>-₱{discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Payment Input */}
                <div className="payment-right-col">
                  <div className="payment-methods mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    <button
                      className={`pay-method-btn ${paymentMethod === 'Cash' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('Cash')}
                    >
                      Cash
                    </button>
                    <button
                      className={`pay-method-btn ${paymentMethod === 'Card' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('Card'); setAmountTendered(total); }}
                    >
                      Card
                    </button>
                    <button
                      className={`pay-method-btn ${paymentMethod === 'GCash' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('GCash'); setAmountTendered(total); }}
                    >
                      GCash
                    </button>
                    <button
                      className={`pay-method-btn ${paymentMethod === 'Split' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('Split'); }}
                    >
                      Split
                    </button>
                  </div>

                  {paymentMethod === 'Cash' && (
                    <div className="cash-calculator mb-4">
                      <label className="text-secondary" style={{ fontSize: '0.85rem' }}>Amount Tendered</label>
                      <div className="tendered-input-wrapper">
                        <span className="currency-symbol">₱</span>
                        <input
                          type="number"
                          className="tendered-input"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          autoFocus
                          placeholder="0.00"
                        />
                      </div>

                      <div className="quick-cash-btns mt-2">
                        {[50, 100, 200, 500, 1000].map(val => (
                          <button key={val} className="quick-btn" onClick={() => setAmountTendered(val)}>
                            ₱{val}
                          </button>
                        ))}
                        <button className="quick-btn" onClick={() => setAmountTendered(Math.ceil(total))}>Exact</button>
                      </div>

                      <div className="change-display mt-4">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-secondary font-bold">Change Due</span>
                          <span className={`text-xl font-bold ${changeDue >= 0 ? 'text-success' : 'text-danger'}`}>
                            ₱{changeDue >= 0 ? changeDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(paymentMethod === 'GCash' || paymentMethod === 'Card') && (
                    <div className="mb-4">
                      <label className="text-secondary" style={{ fontSize: '0.85rem' }}>Reference Number / Approval Code</label>
                      <div className="tendered-input-wrapper" style={{ marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          className="tendered-input"
                          style={{ fontSize: '1.1rem', fontWeight: 500 }}
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          autoFocus
                          placeholder="e.g. 10029348912"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'Split' && (
                    <div className="split-calculator mb-4">
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <label className="text-secondary" style={{ fontSize: '0.85rem' }}>Cash Amount</label>
                          <div className="tendered-input-wrapper">
                            <span className="currency-symbol" style={{ fontSize: '1rem' }}>₱</span>
                            <input
                              type="number"
                              className="tendered-input"
                              style={{ fontSize: '1.2rem' }}
                              value={splitCash}
                              onChange={(e) => setSplitCash(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-secondary flex justify-between items-center" style={{ fontSize: '0.85rem' }}>
                            <span>Non-Cash</span>
                            <select
                              className="text-primary bg-transparent border-none outline-none font-bold cursor-pointer"
                              value={splitNonCashMethod}
                              onChange={(e) => setSplitNonCashMethod(e.target.value)}
                            >
                              <option value="GCash">GCash</option>
                              <option value="Card">Card</option>
                            </select>
                          </label>
                          <div className="tendered-input-wrapper">
                            <span className="currency-symbol" style={{ fontSize: '1rem' }}>₱</span>
                            <input
                              type="number"
                              className="tendered-input"
                              style={{ fontSize: '1.2rem' }}
                              value={splitNonCash}
                              onChange={(e) => setSplitNonCash(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-secondary" style={{ fontSize: '0.85rem' }}>{splitNonCashMethod} Reference Number</label>
                        <div className="tendered-input-wrapper" style={{ marginTop: '0.25rem' }}>
                          <input
                            type="text"
                            className="tendered-input"
                            style={{ fontSize: '1rem', fontWeight: 500 }}
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="Reference No."
                          />
                        </div>
                      </div>

                      <div className="change-display mt-4">
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className="text-secondary">Total Tendered</span>
                          <span className="font-bold">₱{splitTotalEntered.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-secondary font-bold">Change Due</span>
                          <span className={`text-xl font-bold ${splitChangeDue >= 0 ? 'text-success' : 'text-danger'}`}>
                            ₱{splitChangeDue >= 0 ? splitChangeDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn-primary w-full mt-auto"
                    style={{ padding: '1rem', fontSize: '1.1rem' }}
                    onClick={handleCheckout}
                    disabled={(paymentMethod === 'Cash' && (changeDue < 0 || !amountTendered)) || (paymentMethod === 'Split' && splitChangeDue < 0)}
                  >
                    Confirm & Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Receipt Modal — with printing animation + payment success summary */}
      {showReceiptModal && receiptData && (
        <ModalPortal>
          <div className="modal-overlay receipt-modal-overlay">
            <div className="receipt-success-layout">

              {/* LEFT: Payment Success Summary (Landscape Card) */}
              <div className="receipt-modal receipt-success-card no-print">
                <button className="icon-btn receipt-close-btn" onClick={() => setShowReceiptModal(false)}>
                  <X size={18} />
                </button>

                <div className="success-card-grid">
                  {/* Left Column of Success Card */}
                  <div className="success-card-col">
                    <div className="success-header-left">
                      <div className="success-check-icon">
                        <CheckCircle2 size={48} />
                      </div>
                      <div>
                        <h2 className="success-title">Payment Successful!</h2>
                        <p className="success-subtitle">Receipt #{receiptData.receiptNumber}</p>
                      </div>
                    </div>

                    <div className="success-amount-card">
                      <span className="success-amount-label">Total Amount Paid</span>
                      <h1 className="success-amount-value">₱{receiptData.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
                      <div className="success-amount-details">
                        <div className="success-amount-row">
                          <span>Amount Tendered</span>
                          <span>₱{receiptData.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="success-amount-row">
                          <span>Change Due</span>
                          <span>₱{receiptData.change.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column of Success Card */}
                  <div className="success-card-col">
                    {/* Item purchase summary */}
                    <div className="success-items-summary">
                      <span className="success-items-summary-title">
                        <Package size={14} /> {receiptData.items.length} item{receiptData.items.length !== 1 ? 's' : ''} purchased
                      </span>
                      <div className="success-items-list">
                        {receiptData.items.map((item, idx) => (
                          <div key={idx} className="success-item-row">
                            <span className="success-item-name">
                              {item.name} <span className="success-item-qty">×{item.quantity}</span>
                            </span>
                            <span className="success-item-price">₱{getItemEffectiveTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Digital receipt */}
                    <div className="digital-receipt-section">
                      <label>Send Digital Receipt</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <input
                          type="text"
                          placeholder="Email or SMS Phone Number"
                          value={customerContact}
                          onChange={(e) => setCustomerContact(e.target.value)}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px' }}
                        />
                        <button
                          className="btn-secondary"
                          onClick={handleSendDigital}
                          disabled={isSendingDigital}
                          style={{ padding: '8px 12px', borderRadius: '6px' }}
                        >
                          {isSendingDigital ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                        </button>
                      </div>
                    </div>

                    <div className="receipt-actions">
                      <button
                        className="btn-primary"
                        onClick={handlePrint}
                        disabled={isPrinting || isConfirming}
                      >
                        {isPrinting ? (<><Loader2 size={18} className="animate-spin" /> Printing...</>) : ('Print Receipt')}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={handleConfirmToContinue}
                        disabled={isConfirming || isPrinting}
                      >
                        {isConfirming ? (<><Loader2 size={18} className="animate-spin" /> Loading...</>) : ('New Order')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Receipt "printing out" of the printer */}
              <div className="receipt-print-wrap">
                <div className="receipt-printer-slot" />
                <div className={`receipt-paper ${receiptAnimating ? 'receipt-paper-printing' : 'receipt-paper-done'}`}>
                  <div className="receipt-content" id="printable-receipt">
                    <div className="receipt-header text-center mb-4" style={{ textAlign: 'center' }}>
                      <h2 style={{ margin: '0 0 5px 0' }}>TECHSTORE</h2>
                      <p style={{ margin: '0' }}>123 Tech Avenue, Silicon City</p>
                      <p style={{ margin: '5px 0' }}>Receipt #: {receiptData.receiptNumber}</p>
                      <p style={{ margin: '0' }}>Date: {receiptData.date}</p>
                      <p style={{ margin: '5px 0' }}>Cashier: Alex Admin</p>
                      {receiptData.customerName && (
                        <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Customer: {receiptData.customerName}</p>
                      )}
                    </div>

                    <table className="receipt-table w-full mb-4" style={{ width: '100%', marginBottom: '1rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '5px 0' }}>Item</th>
                          <th style={{ textAlign: 'center', padding: '5px 0' }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '5px 0' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '5px 0' }}>
                              {item.name}
                              {item.note && (
                                <div style={{ fontSize: '0.75em', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>
                                  ✏ {item.note}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '5px 0' }}>
                              {item.itemDiscount > 0 && (
                                <div style={{ fontSize: '0.75em', color: '#888', textDecoration: 'line-through' }}>
                                  ₱{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              ₱{getItemEffectiveTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {item.itemDiscount > 0 && (
                                <div style={{ fontSize: '0.75em', color: '#EF4444' }}>
                                  -{item.itemDiscountType === '%' ? `${item.itemDiscount}%` : `₱${Number(item.itemDiscount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="receipt-summary border-t pt-2" style={{ borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal:</span>
                        <span>₱{receiptData.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tax (10%):</span>
                        <span>₱{receiptData.tax.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                        <span>Discount:</span>
                        <span>-₱{receiptData.discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
                        <span>Total:</span>
                        <span>₱{receiptData.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="receipt-payment mt-4 pt-2 text-sm" style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #ccc', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Payment Method:</span>
                        <span>{receiptData.paymentMethod}</span>
                      </div>
                      {receiptData.referenceNumber && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Ref #:</span>
                          <span>{receiptData.referenceNumber}</span>
                        </div>
                      )}
                      {receiptData.paymentMethod === 'Cash' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Amount Tendered:</span>
                            <span>₱{receiptData.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Change:</span>
                            <span>₱{receiptData.change.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}
                      {receiptData.paymentMethod.startsWith('Split') && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                            <span>Cash Tendered:</span>
                            <span>₱{receiptData.splitCash.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{receiptData.splitNonCashMethod} Tendered:</span>
                            <span>₱{receiptData.splitNonCash.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontWeight: 'bold' }}>
                            <span>Change:</span>
                            <span>₱{receiptData.change.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="receipt-footer text-center mt-6 text-sm" style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${receiptData.receiptNumber}`} alt="Receipt QR" width="100" height="100" />
                      </div>
                      <p style={{ margin: '5px 0' }}>Scan for digital copy & returns</p>
                      <p style={{ margin: '0' }}>Thank you for shopping with us!</p>
                    </div>
                  </div>
                </div>
              </div>

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

export default POS;