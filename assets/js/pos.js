// assets/js/pos.js - Vanilla JS POS Terminal Logic

let cart = [];
let currentCategory = 'all';
let searchQuery = '';
let storeTaxRate = 12; // 12% default VAT

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
  setupCategoryFilters();
  renderCart();
});

function setupSearch() {
  const searchInput = document.getElementById('posSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterProducts();
    });
  }
}

function setupCategoryFilters() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-cat');
      filterProducts();
    });
  });
}

function filterProducts() {
  const cards = document.querySelectorAll('.pos-card');
  cards.forEach(card => {
    const name = card.getAttribute('data-name').toLowerCase();
    const barcode = (card.getAttribute('data-barcode') || '').toLowerCase();
    const cat = card.getAttribute('data-category');

    const matchesSearch = !searchQuery || name.includes(searchQuery) || barcode.includes(searchQuery);
    const matchesCat = currentCategory === 'all' || cat === currentCategory;

    if (matchesSearch && matchesCat) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function addToCart(id, name, price, stock, imageUrl) {
  if (stock <= 0) {
    showToast('This product is out of stock!', 'error');
    return;
  }

  const existing = cart.find(item => item.id === id);
  if (existing) {
    if (existing.quantity >= stock) {
      showToast(`Cannot add more. Only ${stock} left in stock!`, 'error');
      return;
    }
    existing.quantity++;
  } else {
    cart.push({
      id: id,
      name: name,
      price: parseFloat(price),
      stock: parseInt(stock),
      quantity: 1,
      image: imageUrl
    });
  }

  renderCart();
  showToast(`Added ${name} to order`);
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(id);
    return;
  }

  if (newQty > item.stock) {
    showToast(`Maximum available stock is ${item.stock}`, 'error');
    return;
  }

  item.quantity = newQty;
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm('Are you sure you want to clear the cart?')) {
    cart = [];
    renderCart();
  }
}

function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountInput = document.getElementById('cartDiscount');
  const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
  
  // Tax calculation (e.g. 12%)
  const tax = (subtotal - discount > 0) ? (subtotal - discount) * (storeTaxRate / 100) : 0;
  const total = Math.max(0, subtotal - discount + tax);

  return { subtotal, discount, tax, total };
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const checkoutBtn = document.getElementById('btnCheckout');
  const emptyView = document.getElementById('cartEmptyView');

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '';
    if (emptyView) emptyView.style.display = 'flex';
    if (checkoutBtn) checkoutBtn.disabled = true;
    updateTotalDisplays(0, 0, 0, 0);
    return;
  }

  if (emptyView) emptyView.style.display = 'none';
  if (checkoutBtn) checkoutBtn.disabled = false;

  let html = '';
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    html += `
      <div class="cart-item">
        <div class="cart-item-top">
          <span class="cart-item-title">${escapeHtml(item.name)}</span>
          <span class="cart-item-price">${formatCurrency(itemTotal)}</span>
        </div>
        <div class="cart-item-bottom">
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
            <span class="qty-display">${item.quantity}</span>
            <button type="button" class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
          </div>
          <button type="button" class="btn-remove-item" onclick="removeFromCart(${item.id})" title="Remove">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();

  const { subtotal, discount, tax, total } = calculateTotals();
  updateTotalDisplays(subtotal, discount, tax, total);
}

function updateTotalDisplays(subtotal, discount, tax, total) {
  const subEl = document.getElementById('cartSubtotal');
  const taxEl = document.getElementById('cartTax');
  const totalEl = document.getElementById('cartTotal');

  if (subEl) subEl.innerText = formatCurrency(subtotal);
  if (taxEl) taxEl.innerText = formatCurrency(tax);
  if (totalEl) totalEl.innerText = formatCurrency(total);
}

// Payment & Checkout
function openCheckoutModal() {
  if (cart.length === 0) {
    showToast('Cart is empty!', 'error');
    return;
  }

  const { total } = calculateTotals();
  document.getElementById('checkoutTotalDisplay').innerText = formatCurrency(total);
  document.getElementById('amountPaidInput').value = total.toFixed(2);
  updateChangeAmount();

  openModal('checkoutModal');
  setTimeout(() => document.getElementById('amountPaidInput').focus(), 100);
}

function setQuickCash(amount) {
  const { total } = calculateTotals();
  if (amount === 'exact') {
    document.getElementById('amountPaidInput').value = total.toFixed(2);
  } else {
    document.getElementById('amountPaidInput').value = parseFloat(amount).toFixed(2);
  }
  updateChangeAmount();
}

function updateChangeAmount() {
  const { total } = calculateTotals();
  const paid = parseFloat(document.getElementById('amountPaidInput').value) || 0;
  const change = Math.max(0, paid - total);
  
  document.getElementById('changeDisplay').innerText = formatCurrency(change);
  
  const confirmBtn = document.getElementById('btnConfirmPayment');
  if (confirmBtn) {
    if (paid < total) {
      confirmBtn.disabled = true;
      confirmBtn.innerText = 'Insufficient Amount';
    } else {
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Complete Order';
    }
  }
}

async function submitPayment() {
  const { subtotal, discount, tax, total } = calculateTotals();
  const paid = parseFloat(document.getElementById('amountPaidInput').value) || 0;
  const paymentMethod = document.getElementById('paymentMethodSelect').value;
  const customerId = document.getElementById('customerSelect') ? document.getElementById('customerSelect').value : null;

  if (paid < total) {
    showToast('Amount paid is less than total amount due!', 'error');
    return;
  }

  const confirmBtn = document.getElementById('btnConfirmPayment');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Processing...';
  }

  try {
    const payload = {
      items: cart,
      subtotal: subtotal,
      tax: tax,
      discount: discount,
      total: total,
      payment_method: paymentMethod,
      amount_paid: paid,
      change_amount: paid - total,
      customer_id: customerId
    };

    const res = await fetch('api/checkout.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      closeModal('checkoutModal');
      showReceipt(result, payload);
      
      // Update stocks on UI cards
      cart.forEach(cItem => {
        const card = document.querySelector(`.pos-card[data-id="${cItem.id}"]`);
        if (card) {
          const stockSpan = card.querySelector('.pos-card-stock');
          const currentStock = parseInt(card.getAttribute('data-stock')) - cItem.quantity;
          card.setAttribute('data-stock', currentStock);
          if (stockSpan) {
            stockSpan.innerText = `${currentStock} in stock`;
            if (currentStock <= 0) {
              card.classList.add('out-of-stock');
              stockSpan.className = 'pos-card-stock zero';
              stockSpan.innerText = 'Out of Stock';
            }
          }
        }
      });

      cart = [];
      renderCart();
      showToast('Transaction completed successfully!', 'success');
    } else {
      showToast(result.message || 'Payment failed', 'error');
    }
  } catch (err) {
    showToast('Network or server error processing payment.', 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Complete Order';
    }
  }
}

function showReceipt(saleInfo, saleData) {
  const receiptContainer = document.getElementById('receiptContent');
  if (!receiptContainer) return;

  let itemsHtml = '';
  saleData.items.forEach(item => {
    itemsHtml += `
      <tr>
        <td>${escapeHtml(item.name)} x${item.quantity}</td>
        <td class="text-right">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `;
  });

  receiptContainer.innerHTML = `
    <div class="receipt-box">
      <div class="receipt-header">
        <h4>TECHSTORE POS</h4>
        <p>123 Tech Lane, Gadget City</p>
        <p>Tel: 0917-123-4567</p>
        <p>Receipt #: <strong>${saleInfo.receipt_number}</strong></p>
        <p>Date: ${saleInfo.date}</p>
      </div>

      <table class="receipt-table">
        <thead>
          <tr><th>Item</th><th class="text-right">Total</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="receipt-totals">
        <div class="receipt-row"><span>Subtotal:</span><span>${formatCurrency(saleData.subtotal)}</span></div>
        <div class="receipt-row"><span>Tax (12%):</span><span>${formatCurrency(saleData.tax)}</span></div>
        <div class="receipt-row bold"><span>TOTAL:</span><span>${formatCurrency(saleData.total)}</span></div>
        <div class="receipt-row"><span>Payment (${saleData.payment_method}):</span><span>${formatCurrency(saleData.amount_paid)}</span></div>
        <div class="receipt-row"><span>Change:</span><span>${formatCurrency(saleData.change_amount)}</span></div>
      </div>

      <div class="receipt-footer">
        <p>Thank you for shopping with us!</p>
        <p>Please come again.</p>
      </div>
    </div>
  `;

  openModal('receiptModal');
}

function printReceipt() {
  const content = document.getElementById('receiptContent').innerHTML;
  const printWindow = window.open('', '', 'width=400,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt Print</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
          .text-right { text-align: right; }
          table { width: 100%; border-collapse: collapse; }
          .bold { font-weight: bold; }
          .receipt-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .receipt-header, .receipt-footer { text-align: center; }
          hr { border: none; border-top: 1px dashed #000; }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
