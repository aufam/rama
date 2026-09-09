/**
 * kiosk.js - Ordering Machine & Mobile Web App Controller
 * Mengelola navigasi kategori chip, pencarian, kustomisasi produk,
 * bottom sheet keranjang, dan penyalinan teks pesanan WhatsApp.
 */

let allProducts = [];
let allCategories = [];
let activeCategoryId = 'all';
let searchQuery = '';

// Status sementara saat memilih item di modal detail
let currentItemForModal = null;
let itemModalQty = 1;

// Helper ikon kategori
function getCategoryIcon(categoryId) {
  const cat = allCategories.find(c => c.id === categoryId);
  return cat ? cat.icon : 'fa-box';
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialData();
  setupEventListeners();
  renderCartUI();
});

async function loadInitialData() {
  try {
    allCategories = await Store.getCategories();
    allProducts = await Store.getProducts();
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error('Gagal memuat data awal produk:', err);
    showToast('Gagal memuat katalog produk', 'error');
  }
}

function setupEventListeners() {
  // Kotak pencarian
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Tombol summary keranjang membuka Drawer Keranjang
  const cartTrigger = document.getElementById('cart-summary-trigger');
  if (cartTrigger) {
    cartTrigger.addEventListener('click', openCartModal);
  }

  // Tombol checkout membuka modal salin pesanan WhatsApp
  const btnCheckout = document.getElementById('btn-checkout');
  if (btnCheckout) {
    btnCheckout.addEventListener('click', openCheckoutModal);
  }

  // Tombol kosongkan keranjang
  const btnClearCart = document.getElementById('btn-clear-cart');
  if (btnClearCart) {
    btnClearCart.addEventListener('click', () => {
      const cart = Store.getCart();
      if (cart.length === 0) return;
      if (confirm('Kosongkan semua pesanan di keranjang?')) {
        Store.clearCart();
        renderCartUI();
        showToast('Keranjang telah dikosongkan');
      }
    });
  }

  // Tutup modal saat klik area latar belakang (overlay)
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Tombol Kirim Teks Pesanan WhatsApp (Form submit handled via handleSendWhatsAppOrder)
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleSendWhatsAppOrder);
  }

  // Update pratinjau teks saat pengguna mengisi form data pemesan
  ['cust-name', 'cust-phone', 'cust-address', 'cust-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateOrderPreview);
    }
  });

  // Kontrol kuantitas pada modal produk
  const btnModalMinus = document.getElementById('modal-qty-minus');
  const btnModalPlus = document.getElementById('modal-qty-plus');
  if (btnModalMinus && btnModalPlus) {
    btnModalMinus.addEventListener('click', () => {
      if (itemModalQty > 1) {
        itemModalQty--;
        document.getElementById('modal-qty-val').textContent = itemModalQty;
      }
    });
    btnModalPlus.addEventListener('click', () => {
      itemModalQty++;
      document.getElementById('modal-qty-val').textContent = itemModalQty;
    });
  }

  // Tombol konfirmasi tambah dari modal item
  const btnModalAddCart = document.getElementById('btn-modal-add-cart');
  if (btnModalAddCart) {
    btnModalAddCart.addEventListener('click', () => {
      if (currentItemForModal) {
        const notes = document.getElementById('modal-item-notes').value;
        Store.addToCart(currentItemForModal, itemModalQty, notes);
        renderCartUI();
        closeAllModals();
        showToast(`+${itemModalQty} ${currentItemForModal.name} dimasukkan keranjang`, 'success');
      }
    });
  }
}

function renderCategories() {
  const categoryBar = document.getElementById('category-bar');
  if (!categoryBar) return;

  categoryBar.innerHTML = allCategories.map(cat => `
    <button class="cat-chip-btn ${cat.id === activeCategoryId ? 'active' : ''}" data-cat-id="${cat.id}">
      <i class="fa-solid ${cat.icon}"></i>
      <span>${cat.name}</span>
    </button>
  `).join('');

  categoryBar.querySelectorAll('.cat-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategoryId = btn.getAttribute('data-cat-id');
      categoryBar.querySelectorAll('.cat-chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Auto-scroll the active chip into view horizontally
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      renderProducts();
    });
  });
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  let filtered = allProducts;

  // Filter berdasarkan kategori
  if (activeCategoryId !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategoryId);
  }

  // Filter berdasarkan pencarian kata kunci
  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description && p.description.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-box-open"></i>
        <h3 style="font-weight: 700; color: var(--gray-700);">Produk tidak ditemukan</h3>
        <p style="font-size: 0.85rem;">Silakan cari dengan kata kunci lain atau pilih kategori berbeda.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const icon = getCategoryIcon(p.category);
    const isOutOfStock = p.stock <= 0;
    const thumbHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}">`
      : `<i class="fa-solid ${icon}"></i>`;

    // NOTE: stock is disabled
    return `
      <div class="product-card" onclick="openProductDetailModal('${p.id}')">
        <span class="product-stock-tag ${p.stock <= 5 ? 'low' : ''}" hidden>
          ${p.stock > 0 ? `Sisa ${p.stock}` : 'Habis'}
        </span>
        <div class="product-card-top">
          <div class="product-icon-wrap">
            ${thumbHtml}
          </div>
          <h4 class="product-name" title="${p.name}">${p.name}</h4>
          <p class="product-desc">${p.description || 'Pilihan berkualitas Rama Swalayan.'}</p>
        </div>
        <div class="product-card-bottom">
          <div class="product-price">${Store.formatCurrency(p.price)} <span class="product-unit">/${p.unit || 'buah'}</span></div>
          <button class="btn-add-kiosk" ${isOutOfStock ? 'disabled' : ''} onclick="event.stopPropagation(); ${isOutOfStock ? '' : `quickAddToCart('${p.id}')`}">
            <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Habis' : 'Beli'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function quickAddToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  Store.addToCart(product, 1);
  renderCartUI();
  showToast(`+1 ${product.name} dimasukkan keranjang`, 'success');
}

function openProductDetailModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  currentItemForModal = product;
  itemModalQty = 1;

  document.getElementById('modal-item-title').textContent = product.name;
  document.getElementById('modal-item-desc').textContent = product.description || 'Produk segar dan berkualitas Rama Swalayan.';
  document.getElementById('modal-item-price').textContent = `${Store.formatCurrency(product.price)} / ${product.unit || 'buah'}`;

  const modalIcon = document.getElementById('modal-item-icon');
  const modalImg = document.getElementById('modal-item-img');

  if (product.image) {
    if (modalImg) {
      modalImg.src = product.image;
      modalImg.style.display = 'block';
    }
    if (modalIcon) modalIcon.style.display = 'none';
  } else {
    if (modalImg) modalImg.style.display = 'none';
    if (modalIcon) {
      modalIcon.className = `fa-solid ${getCategoryIcon(product.category)}`;
      modalIcon.style.display = 'block';
    }
  }

  document.getElementById('modal-qty-val').textContent = '1';
  document.getElementById('modal-item-notes').value = '';

  const modal = document.getElementById('modal-product-detail');
  if (modal) modal.classList.add('active');
}

function renderCartUI() {
  const cart = Store.getCart();
  const { totalCount, totalPrice } = Store.getCartTotal(cart);

  // Update badge dan total bar bawah
  const badge = document.getElementById('cart-badge');
  const footerTotal = document.getElementById('cart-footer-total');
  const btnCheckout = document.getElementById('btn-checkout');

  if (badge) badge.textContent = totalCount;
  if (footerTotal) footerTotal.textContent = Store.formatCurrency(totalPrice);
  if (btnCheckout) btnCheckout.disabled = totalCount === 0;

  // Render daftar item di modal keranjang
  const cartItemList = document.getElementById('modal-cart-items');
  const modalCartTotal = document.getElementById('modal-cart-total-price');

  if (modalCartTotal) modalCartTotal.textContent = Store.formatCurrency(totalPrice);

  if (cartItemList) {
    if (cart.length === 0) {
      cartItemList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--gray-500);">
          <i class="fa-solid fa-basket-shopping" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--gray-300); display: block;"></i>
          <p style="font-size: 0.9rem; font-weight: 600;">Keranjang belanja Anda masih kosong.</p>
          <span style="font-size: 0.8rem;">Pilih barang yang ingin Anda beli dari katalog.</span>
        </div>
      `;
    } else {
      cartItemList.innerHTML = cart.map((item, idx) => `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-sub">${Store.formatCurrency(item.price)} / ${item.unit || 'buah'}</div>
            ${item.notes ? `<div class="cart-item-note"><i class="fa-regular fa-comment-dots"></i> ${item.notes}</div>` : ''}
          </div>
          <div class="cart-qty-controls">
            <button class="btn-qty" onclick="handleCartQty(${idx}, ${item.quantity - 1})">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="btn-qty" onclick="handleCartQty(${idx}, ${item.quantity + 1})">+</button>
          </div>
          <div class="cart-item-price">${Store.formatCurrency(item.price * item.quantity)}</div>
          <button class="btn-close-modal" style="width:28px; height:28px; background: transparent;" onclick="handleRemoveCart(${idx})" title="Hapus item">
            <i class="fa-solid fa-trash" style="font-size:0.75rem; color:var(--danger)"></i>
          </button>
        </div>
      `).join('');
    }
  }
}

window.handleCartQty = function(index, newQty) {
  Store.updateCartItemQuantity(index, newQty);
  renderCartUI();
  updateOrderPreview();
};

window.handleRemoveCart = function(index) {
  Store.removeCartItem(index);
  renderCartUI();
  updateOrderPreview();
};

function openCartModal() {
  renderCartUI();
  const modal = document.getElementById('modal-cart-drawer');
  if (modal) modal.classList.add('active');
}

let currentCheckoutOrderId = null;

function openCheckoutModal() {
  const cart = Store.getCart();
  if (cart.length === 0) {
    showToast('Keranjang masih kosong', 'error');
    return;
  }
  closeAllModals();
  // Generate ID pesanan unik jika belum ada
  if (!currentCheckoutOrderId) {
    currentCheckoutOrderId = 'RAMA-' + Math.floor(10000 + Math.random() * 90000);
  }

  // Hide tracking link container on modal open
  const trackingContainer = document.getElementById('tracking-link-container');
  if (trackingContainer) trackingContainer.style.display = 'none';

  updateOrderPreview();
  const modal = document.getElementById('modal-checkout');
  if (modal) modal.classList.add('active');
}

function getCustomerFormData() {
  return {
    name: document.getElementById('cust-name')?.value || '',
    phone: document.getElementById('cust-phone')?.value || '',
    address: document.getElementById('cust-address')?.value || '',
    notes: document.getElementById('cust-notes')?.value || ''
  };
}

function updateOrderPreview() {
  const previewBox = document.getElementById('order-text-preview');
  if (!previewBox) return;

  if (!currentCheckoutOrderId) {
    currentCheckoutOrderId = 'RAMA-' + Math.floor(10000 + Math.random() * 90000);
  }

  const customerInfo = getCustomerFormData();
  const orderText = Store.formatOrderText(customerInfo, null, currentCheckoutOrderId);
  previewBox.textContent = orderText;
}

async function handleSendWhatsAppOrder(e) {
  if (e && e.preventDefault) e.preventDefault();

  const customerInfo = getCustomerFormData();
  const cart = Store.getCart();

  if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
    showToast('Harap lengkapi Nama, No. WhatsApp, dan Alamat Pengiriman!', 'error');
    return;
  }

  if (!cart || cart.length === 0) {
    showToast('Keranjang belanja kosong', 'error');
    return;
  }

  if (!currentCheckoutOrderId) {
    currentCheckoutOrderId = 'RAMA-' + Math.floor(10000 + Math.random() * 90000);
  }

  // Simpan pesanan ke database order dummy
  await Store.createOrder(customerInfo, cart, currentCheckoutOrderId);

  const orderText = Store.formatOrderText(customerInfo, cart, currentCheckoutOrderId);
  const waAdminPhone = '6285327961606';
  const waUrl = Store.getWhatsAppSendUrl(waAdminPhone, orderText);

  // Tampilkan tautan pantau pesanan
  const trackingUrl = Store.getOrderTrackingUrl(currentCheckoutOrderId);
  const trackingContainer = document.getElementById('tracking-link-container');
  const trackingLink = document.getElementById('tracking-url-link');

  if (trackingContainer && trackingLink) {
    trackingLink.href = trackingUrl;
    trackingContainer.style.display = 'block';
    trackingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showToast('Pesanan berhasil dibuat! Membuka WhatsApp admin...', 'success');

  // Buka WhatsApp di tab/aplikasi baru
  window.open(waUrl, '_blank');
}

window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('active');
  });
  currentItemForModal = null;
};

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
