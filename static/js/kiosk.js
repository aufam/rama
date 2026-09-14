/**
 * kiosk.js - Ordering Machine & Mobile Web App Controller
 * Mengelola navigasi kategori chip, pseudo kategori Promo,
 * pencarian, lazy rendering kategori & produk, kustomisasi produk,
 * bottom sheet keranjang, auto-hide header saat scroll, dan penyalinan teks pesanan WhatsApp.
 */

let allProducts = [];
let allCategories = [];
let activeCategoryId = null; // null = semua kategori, 'promo' = promo, or category ID
let searchQuery = '';

// Multi-category lazy loading state
let categoriesToRender = [];
let catRenderIndex = 0;
const CAT_RENDER_BATCH = 3;            // Render 3 categories per scroll batch
const PRODUCTS_PER_CAT_PREVIEW = 4;   // Preview 4 products per category section

// Single-category product pagination state
let filteredProducts = [];
let renderIndex = 0;
const RENDER_BATCH = 20;

// Status sementara saat memilih item di modal detail
let currentItemForModal = null;
let itemModalQty = 1;

// Helper ikon kategori
function getCategoryIcon(categoryId) {
  if (categoryId === 'promo') return 'fa-fire';
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
    Store.updateCart(allProducts);
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

  // Infinite Scroll & Scroll Direction Aware Auto-Hiding Header Container
  const productsContainer = document.querySelector('.products-container');
  let lastScrollTop = 0;
  const scrollThreshold = 8;

  if (productsContainer) {
    productsContainer.addEventListener('scroll', () => {
      const st = productsContainer.scrollTop;

      // 1. Infinite Scroll Trigger
      if (st + productsContainer.clientHeight >= productsContainer.scrollHeight - 200) {
        if (!activeCategoryId && !searchQuery) {
          loadMoreCategories();
        } else {
          loadMoreProducts();
        }
      }

      // 2. Header Auto-Hide / Show on Scroll Direction
      const header = document.querySelector('.kiosk-header');
      if (header) {
        if (st <= 10) {
          // Top of page -> always keep header visible
          header.classList.remove('header-hidden');
        } else if (Math.abs(lastScrollTop - st) > scrollThreshold) {
          if (st > lastScrollTop) {
            // Scrolling Down -> Hide Header
            header.classList.add('header-hidden');
          } else {
            // Scrolling Up -> Show Header (reappears immediately without having to reach the top)
            header.classList.remove('header-hidden');
          }
        }
      }

      lastScrollTop = st;
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

  // Tombol Kirim Teks Pesanan WhatsApp
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleSendWhatsAppOrder);
  }

  // Update pratinjau teks saat pengguna mengisi form data pemesan
  ['cust-name', 'cust-phone', 'cust-member', 'cust-address', 'cust-notes'].forEach(id => {
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
  const categorySelect = document.getElementById('category-select');
  const categoryChipsNav = document.getElementById('category-chips-nav');

  if (categorySelect) {
    let optionsHtml = `<option value="">Semua Kategori</option>`;
    optionsHtml += `<option value="promo">🔥 Promo Special</option>`;
    optionsHtml += allCategories.map(cat => `<option value="${cat.id}">${cat.id}</option>`).join('');
    categorySelect.innerHTML = optionsHtml;
    categorySelect.value = activeCategoryId || '';

    categorySelect.addEventListener('change', (e) => {
      activeCategoryId = e.target.value || null;
      updateActiveCategoryChipsUI();
      renderProducts();
    });
  }

  if (categoryChipsNav) {
    let chipsHtml = `
      <button class="cat-chip-btn ${!activeCategoryId ? 'active' : ''}" data-cat="">
        <i class="fa-solid fa-layer-group"></i> Semua
      </button>
      <button class="cat-chip-btn cat-chip-promo ${activeCategoryId === 'promo' ? 'active' : ''}" data-cat="promo">
        <i class="fa-solid fa-fire"></i> Promo
      </button>
    `;

    chipsHtml += allCategories.map(cat => `
      <button class="cat-chip-btn ${activeCategoryId === cat.id ? 'active' : ''}" data-cat="${cat.id}">
        <i class="fa-solid ${cat.icon || 'fa-box'}"></i> ${cat.id}
      </button>
    `).join('');

    categoryChipsNav.innerHTML = chipsHtml;

    categoryChipsNav.querySelectorAll('.cat-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catValue = btn.getAttribute('data-cat');
        activeCategoryId = catValue || null;

        if (categorySelect) {
          categorySelect.value = activeCategoryId || '';
        }

        updateActiveCategoryChipsUI();
        renderProducts();
      });
    });
  }
}

function updateActiveCategoryChipsUI() {
  const chipsNav = document.getElementById('category-chips-nav');
  if (!chipsNav) return;

  chipsNav.querySelectorAll('.cat-chip-btn').forEach(btn => {
    const catValue = btn.getAttribute('data-cat') || null;
    if ((!activeCategoryId && !catValue) || (activeCategoryId === catValue)) {
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Switch to a specific category directly (e.g., when clicking "Lihat Semua Produk")
 */
window.selectCategoryDirectly = function(catId) {
  activeCategoryId = catId || null;
  const categorySelect = document.getElementById('category-select');
  if (categorySelect) {
    categorySelect.value = activeCategoryId || '';
  }
  updateActiveCategoryChipsUI();
  renderProducts();

  const container = document.querySelector('.products-container');
  if (container) container.scrollTop = 0;
};

/**
 * Generate Product Card HTML template
 */
function generateProductCardHtml(p) {
  p.stock = 100;

  const icon = getCategoryIcon(p.category);
  const isOutOfStock = p.stock <= 0;

  const imageURL = Store.getProductImage(p);
  const thumbHtml = imageURL
    ? `<img src="${imageURL}" alt="${p.name}">`
    : `<i class="fa-solid ${icon}"></i>`;

  const price = Number(p.price) || 0;
  const discount = Number(p.discount) || 0;

  const salePrice = Number(p.salePrice) || (
    discount > 0
      ? price * (1 - discount / 100)
      : price
  );

  const isPromo = discount > 0;

  const promoBadgeHtml = isPromo
    ? `<span class="promo-badge-tag"><i class="fa-solid fa-fire"></i> -${discount}%</span>`
    : '';

  const priceHtml = isPromo
    ? `
    <div class="product-price-container">
      <div class="price-row-top">
        <span class="product-price-original">${Store.formatCurrency(price)}</span>
      </div>
      <div class="price-row-main">
        <span class="product-price-sale">${Store.formatCurrency(salePrice)}</span>
        <span class="product-unit">/${p.unit || 'item'}</span>
      </div>
    </div>
  `
    : `
    <div class="product-price-container">
      <div class="price-row-main">
        <span class="product-price-sale">${Store.formatCurrency(price)}</span>
        <span class="product-unit">/${p.unit || 'item'}</span>
      </div>
    </div>
  `;

  return `
    <div class="product-card ${isPromo ? 'is-promo-card' : ''}" onclick="openProductDetailModal('${p.id}')">
      ${promoBadgeHtml}
      <div class="product-card-top">
        <div class="product-icon-wrap">
          ${thumbHtml}
        </div>
        <h4 class="product-name" title="${p.name}">${p.name}</h4>
        <p class="product-desc">${p.description || 'Pilihan segar & berkualitas Rama Swalayan.'}</p>
      </div>
      <div class="product-card-bottom">
        ${priceHtml}
        <button class="btn-add-kiosk ${isPromo ? 'btn-add-promo' : ''}" ${isOutOfStock ? 'disabled' : ''} onclick="event.stopPropagation(); ${isOutOfStock ? '' : `quickAddToCart('${p.id}')`}">
          <i class="fa-solid fa-plus"></i> ${isOutOfStock ? 'Habis' : 'Tambah'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Main render function
 */
function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Mode 1: "Semua Kategori" view (No specific category selected & no search query)
  if (!activeCategoryId && !searchQuery) {
    prepareCategoriesToRender();
    if (categoriesToRender.length === 0) {
      grid.innerHTML = `
        <div class="empty-catalog" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-box-open"></i>
          <h3 style="font-weight: 700; color: var(--gray-700);">Katalog Kosong</h3>
          <p style="font-size: 0.85rem;">Belum ada kategori dan produk yang tersedia saat ini.</p>
        </div>
      `;
      return;
    }
    catRenderIndex = 0;
    loadMoreCategories();
    return;
  }

  // Mode 2: Single Category or Search Filtered View
  filteredProducts = allProducts;

  if (activeCategoryId === 'promo') {
    filteredProducts = filteredProducts.filter(p => Number(p.discount) > 0);
  } else if (activeCategoryId) {
    filteredProducts = filteredProducts.filter(p => p.category === activeCategoryId);
  }

  if (searchQuery) {
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description && p.description.toLowerCase().includes(searchQuery))
    );
  }

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-box-open"></i>
        <h3 style="font-weight: 700; color: var(--gray-700);">Produk tidak ditemukan</h3>
        <p style="font-size: 0.85rem;">${activeCategoryId === 'promo' ? 'Saat ini belum ada produk promo yang tersedia.' : 'Silakan cari dengan kata kunci lain atau pilih kategori berbeda.'}</p>
      </div>
    `;
    return;
  }

  renderIndex = 0;
  loadMoreProducts();
}

/**
 * Group products into categories list for "Semua Kategori" view
 */
function prepareCategoriesToRender() {
  categoriesToRender = [];

  // 1. Promo category (if active promo products exist)
  const promoProducts = allProducts.filter(p => Number(p.discount) > 0);
  if (promoProducts.length > 0) {
    categoriesToRender.push({
      id: 'promo',
      name: '🔥 Promo Special',
      icon: 'fa-fire',
      isPromoSection: true,
      products: promoProducts
    });
  }

  // 2. Standard categories
  allCategories.forEach(cat => {
    const catProducts = allProducts.filter(p => p.category === cat.id);
    if (catProducts.length > 0) {
      categoriesToRender.push({
        id: cat.id,
        name: cat.id,
        icon: cat.icon || 'fa-box',
        isPromoSection: false,
        products: catProducts
      });
    }
  });
}

/**
 * Lazy render category sections in "Semua Kategori" mode
 */
function loadMoreCategories() {
  const grid = document.getElementById('products-grid');
  if (!grid || catRenderIndex >= categoriesToRender.length) return;

  const nextBatch = categoriesToRender.slice(catRenderIndex, catRenderIndex + CAT_RENDER_BATCH);

  const html = nextBatch.map(cat => {
    const previewProducts = cat.products.slice(0, PRODUCTS_PER_CAT_PREVIEW);
    const productCardsHtml = previewProducts.map(p => generateProductCardHtml(p)).join('');

    return `
      <div class="category-section-card ${cat.isPromoSection ? 'is-promo-section' : ''}">
        <div class="category-section-header">
          <div class="category-section-title">
            <i class="fa-solid ${cat.icon}"></i>
            <span>${cat.name}</span>
          </div>
          <span class="category-section-count">${cat.products.length} Produk</span>
        </div>
        <div class="category-section-grid">
          ${productCardsHtml}
        </div>
        <button class="btn-view-all-cat" onclick="selectCategoryDirectly('${cat.id}')">
          <span>Lihat Semua Produk ${cat.isPromoSection ? 'Promo' : cat.name} (${cat.products.length})</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
  }).join('');

  grid.insertAdjacentHTML('beforeend', html);
  catRenderIndex += CAT_RENDER_BATCH;
}

/**
 * Lazy render individual products in single category view
 */
function loadMoreProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid || renderIndex >= filteredProducts.length) return;

  const nextBatch = filteredProducts.slice(renderIndex, renderIndex + RENDER_BATCH);
  const html = nextBatch.map(p => generateProductCardHtml(p)).join('');

  grid.insertAdjacentHTML('beforeend', html);
  renderIndex += RENDER_BATCH;
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

  const price = Number(product.price) || 0;
  const discount = Number(product.discount) || 0;
  const effectivePrice = discount > 0 ? (Number(product.salePrice) || price * (1 - discount / 100)) : price;

  document.getElementById('modal-item-title').textContent = product.name;
  document.getElementById('modal-item-desc').textContent = product.description || 'Produk segar dan berkualitas Rama Swalayan.';
  document.getElementById('modal-item-price').textContent = `${Store.formatCurrency(effectivePrice)} / ${product.unit || 'item'}`;

  const modalIcon = document.getElementById('modal-item-icon');
  const modalImg = document.getElementById('modal-item-img');

  const imageURL = Store.getProductImage(product);
  if (imageURL) {
    if (modalImg) {
      modalImg.src = imageURL;
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

  const badge = document.getElementById('cart-badge');
  const footerTotal = document.getElementById('cart-footer-total');
  const btnCheckout = document.getElementById('btn-checkout');

  if (badge) badge.textContent = totalCount;
  if (footerTotal) footerTotal.textContent = Store.formatCurrency(totalPrice);
  if (btnCheckout) btnCheckout.disabled = totalCount === 0;

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
            <div class="cart-item-sub">${Store.formatCurrency(item.price)} / ${item.unit || 'item'}</div>
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

function openCheckoutModal() {
  const cart = Store.getCart();
  if (cart.length === 0) {
    showToast('Keranjang masih kosong', 'error');
    return;
  }
  closeAllModals();

  const trackingContainer = document.getElementById('tracking-link-container');
  if (trackingContainer) trackingContainer.style.display = 'none';

  const notTrackingContainer = document.getElementById('not-tracking-link-container');
  if (notTrackingContainer) notTrackingContainer.style.display = 'block';

  updateOrderPreview();
  const modal = document.getElementById('modal-checkout');
  if (modal) modal.classList.add('active');
}

function getCustomerFormData() {
  return {
    name: document.getElementById('cust-name')?.value || '',
    phone: document.getElementById('cust-phone')?.value || '',
    member: document.getElementById('cust-member')?.value || '',
    address: document.getElementById('cust-address')?.value || '',
    notes: document.getElementById('cust-notes')?.value || ''
  };
}

function updateOrderPreview() {
  const previewBox = document.getElementById('order-text-preview');
  if (!previewBox) return;

  const customerInfo = getCustomerFormData();
  const orderText = Store.formatOrderText(customerInfo, null);
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

  let order;
  try {
    order = await Store.createOrder(customerInfo, cart);
  } catch (err) {
    showToast(err, 'error');
    return;
  }

  const orderText = Store.formatOrderText(customerInfo, cart);
  const orderTextWithId = `*No. Pesanan:* ${order.id}\n\n` + orderText;

  const waUrl = Store.getWhatsAppSendUrl(Store.ADMIN_WA, orderTextWithId);

  const trackingUrl = Store.getOrderTrackingUrl(order.id);
  const trackingContainer = document.getElementById('tracking-link-container');
  const trackingLink = document.getElementById('tracking-url-link');

  if (trackingContainer && trackingLink) {
    const notTrackingContainer = document.getElementById('not-tracking-link-container');
    if (notTrackingContainer) notTrackingContainer.style.display = 'none';

    trackingLink.href = trackingUrl;
    trackingContainer.style.display = 'block';
    trackingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showToast('Pesanan berhasil dibuat! Membuka WhatsApp admin...', 'success');

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

  const dismiss = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  };

  toast.addEventListener('click', dismiss);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(dismiss, 3000);
}
