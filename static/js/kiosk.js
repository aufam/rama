/**
 * kiosk.js - Ordering Machine & Mobile Web App Controller
 * Mengelola navigasi kategori chip, pseudo kategori Promo,
 * pencarian, lazy rendering kategori & produk, kustomisasi produk,
 * bottom sheet keranjang, auto-hide header saat scroll, dan penyalinan teks pesanan WhatsApp.
 */

let allProducts = [];
let allCategories = [];
let allBanners = { landscape: [], square1: [], square2: [] };
let activeCategoryId = null; // null = semua kategori, 'promo' = promo, or category ID
let searchQuery = '';
let categorySearchQuery = ''; // Kata kunci pencarian di dalam sidebar drawer kategori

// Timer auto-swipe untuk tiap slot carousel banner promo homepage
let bannerAutoTimers = [];

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
  // Tampilkan skeleton loading langsung agar tidak terlihat kosong/blank
  // selagi Store.getCategories()/getProducts() masih memuat dari backend.
  renderProductsLoadingSkeleton();
  renderCategoryDrawerSkeleton();

  await loadInitialData();
  setupEventListeners();
  renderCartUI();
});

/**
 * Skeleton placeholder untuk grid produk (#products-grid), ditampilkan sebelum
 * data produk selesai dimuat dari backend.
 */
function renderProductsLoadingSkeleton(count = 8) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const skeletonCardHtml = `
    <div class="product-card-skeleton">
      <div class="skeleton-block skeleton-image"></div>
      <div class="skeleton-block skeleton-line w-80"></div>
      <div class="skeleton-block skeleton-line w-45"></div>
    </div>
  `;

  grid.innerHTML = skeletonCardHtml.repeat(count);
}

/**
 * Skeleton placeholder untuk daftar kategori di sidebar drawer, ditampilkan
 * sebelum data kategori selesai dimuat dari backend.
 */
function renderCategoryDrawerSkeleton(count = 6) {
  const list = document.getElementById('category-drawer-list');
  if (!list) return;

  const skeletonItemHtml = `
    <div class="category-drawer-item-skeleton">
      <div class="skeleton-block skeleton-icon"></div>
      <div class="skeleton-block skeleton-text"></div>
    </div>
  `;

  list.innerHTML = skeletonItemHtml.repeat(count);
}

/**
 * Ditampilkan di #products-grid jika pemuatan data awal gagal total,
 * supaya pengguna tidak terjebak melihat skeleton loading selamanya.
 */
function renderProductsErrorState() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-catalog" style="grid-column: 1 / -1;">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h3 style="font-weight: 700; color: var(--gray-700);">Gagal Memuat Produk</h3>
      <p style="font-size: 0.85rem;">Silakan periksa koneksi internet Anda, lalu muat ulang halaman.</p>
    </div>
  `;
}

async function loadInitialData() {
  try {
    allCategories = await Store.getCategories();
    // Render kategori sesegera tersedia, agar sidebar drawer tidak macet
    // dalam kondisi skeleton loading jika pemuatan produk gagal setelah ini.
    renderCategories();

    allProducts = await Store.getProducts();
    Store.updateCart(allProducts);

    // Banner promo bersifat non-kritikal: jika endpoint backend-nya belum siap,
    // katalog produk tetap tampil normal tanpa banner.
    try {
      allBanners = await Store.getBanners();
    } catch (bannerErr) {
      console.warn('Gagal memuat banner promo (opsional):', bannerErr);
    }

    // Render ulang kategori (agar item pseudo "Promo" ikut muncul jika relevan)
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error('Gagal memuat data awal produk:', err);
    showToast('Gagal memuat katalog produk', 'error');
    renderProductsErrorState();
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

  // Tombol pemicu sidebar kategori & interaksi drawer-nya
  const categoryTriggerBtn = document.getElementById('category-trigger-btn');
  if (categoryTriggerBtn) {
    categoryTriggerBtn.addEventListener('click', openCategoryDrawer);
  }

  const categoryDrawerClose = document.getElementById('category-drawer-close');
  if (categoryDrawerClose) {
    categoryDrawerClose.addEventListener('click', closeCategoryDrawer);
  }

  const categoryDrawerOverlay = document.getElementById('category-drawer-overlay');
  if (categoryDrawerOverlay) {
    categoryDrawerOverlay.addEventListener('click', closeCategoryDrawer);
  }

  // Kotak pencarian kategori di dalam sidebar drawer
  const categorySearchInput = document.getElementById('category-search-input');
  if (categorySearchInput) {
    categorySearchInput.addEventListener('input', (e) => {
      categorySearchQuery = e.target.value;
      renderCategoryDrawerList();
    });
  }

  // Tombol mengambang untuk menghubungi CS via WhatsApp
  const waFloatBtn = document.getElementById('btn-wa-float');
  if (waFloatBtn) {
    const waMessage = 'Halo Rama Swalayan, saya ingin bertanya seputar produk/pesanan.';
    waFloatBtn.href = Store.getWhatsAppSendUrl(Store.ADMIN_WA, waMessage);
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

  // Navigasi bawah: Home / Keranjang / Riwayat
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
  });

  // Tombol checkout di halaman Keranjang membuka modal salin pesanan WhatsApp
  const btnPageCheckout = document.getElementById('btn-page-checkout');
  if (btnPageCheckout) {
    btnPageCheckout.addEventListener('click', openCheckoutModal);
  }

  // Tombol kosongkan keranjang di halaman Keranjang
  const btnClearCartPage = document.getElementById('btn-clear-cart-page');
  if (btnClearCartPage) {
    btnClearCartPage.addEventListener('click', () => {
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

  // Tombol "Gunakan Lokasi Saat Ini" - isi Alamat Pengiriman dengan tautan Google Maps
  setupLocationButton();

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
  renderCategoryDrawerList();
}

/**
 * Bangun daftar item kategori untuk drawer: "Semua Kategori", "Promo",
 * lalu seluruh kategori asli.
 */
function getCategoryDrawerItems() {
  const items = [
    { id: '', name: 'Semua Kategori', icon: 'fa-layer-group', isPromo: false }
  ];

  if (allProducts.some(p => Number(p.discount) > 0)) {
    items.push({ id: 'promo', name: 'Promo', icon: 'fa-fire', isPromo: true });
  }

  allCategories.forEach(cat => {
    items.push({ id: cat.id, name: cat.id, icon: cat.icon || 'fa-box', isPromo: false });
  });

  return items;
}

/**
 * Render daftar kategori di dalam sidebar drawer, terfilter oleh kata kunci pencarian kategori.
 */
function renderCategoryDrawerList() {
  const list = document.getElementById('category-drawer-list');
  if (!list) return;

  const q = categorySearchQuery.trim().toLowerCase();
  let items = getCategoryDrawerItems();

  if (q) {
    items = items.filter(item => item.name.toLowerCase().includes(q));
  }

  if (items.length === 0) {
    list.innerHTML = `<div class="category-drawer-empty">Kategori tidak ditemukan.</div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const isActive = (!activeCategoryId && item.id === '') || activeCategoryId === item.id;
    return `
      <button type="button" class="category-drawer-item ${item.isPromo ? 'cat-chip-promo' : ''} ${isActive ? 'active' : ''}" data-cat="${item.id}">
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.name}</span>
      </button>
    `;
  }).join('');

  list.querySelectorAll('.category-drawer-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const catValue = btn.getAttribute('data-cat');
      activeCategoryId = catValue || null;

      window.location.href = activeCategoryId
        ? `.?category=${encodeURIComponent(activeCategoryId)}`
        : `.`;
    });
  });
}

function updateActiveCategoryDrawerUI() {
  const list = document.getElementById('category-drawer-list');
  if (!list) return;

  list.querySelectorAll('.category-drawer-item').forEach(btn => {
    const catValue = btn.getAttribute('data-cat') || null;
    btn.classList.toggle('active', (!activeCategoryId && !catValue) || activeCategoryId === catValue);
  });
}

function openCategoryDrawer() {
  document.getElementById('category-drawer')?.classList.add('open');
  document.getElementById('category-drawer-overlay')?.classList.add('open');
}

function closeCategoryDrawer() {
  document.getElementById('category-drawer')?.classList.remove('open');
  document.getElementById('category-drawer-overlay')?.classList.remove('open');
}

/**
 * Switch to a specific category directly (e.g., when clicking "Lihat Semua Produk")
 */
window.selectCategoryDirectly = function(catId) {
  activeCategoryId = catId || null;
  window.location.href = activeCategoryId
    ? `.?category=${encodeURIComponent(activeCategoryId)}`
    : `.`;
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
    ? `<img src="${imageURL}" alt="${p.name}" loading="lazy">`
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
      <span class="product-price-original">${Store.formatCurrency(price)}</span>
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

  // Tombol tambah mengambang di atas gambar produk (gaya Sayurbox), disembunyikan jika stok habis
  const addButtonHtml = isOutOfStock
    ? ''
    : `
    <button class="btn-add-float ${isPromo ? 'btn-add-float-promo' : ''}" onclick="event.stopPropagation(); quickAddToCart('${p.id}')" aria-label="Tambah ke keranjang">
      <i class="fa-solid fa-plus"></i>
    </button>
  `;

  return `
    <div class="product-card ${isPromo ? 'is-promo-card' : ''}" onclick="openProductDetailModal('${p.id}')">
      <div class="product-image-wrap ${isOutOfStock ? 'is-out-of-stock' : ''}">
        ${thumbHtml}
        ${promoBadgeHtml}
        ${addButtonHtml}
        ${isOutOfStock ? `<div class="out-of-stock-overlay"><span>Stok Habis</span></div>` : ''}
      </div>
      <div class="product-info">
        <h4 class="product-name" title="${p.name}">${p.name}</h4>
        ${priceHtml}
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
  clearBannerTimers();

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

    // Banner promo hanya tampil di mode "Semua Kategori", diletakkan tepat
    // di atas seksi produk Promo (lihat prepareCategoriesToRender/loadMoreCategories).
    const bannerHtml = getBannerSectionHtml();
    if (bannerHtml) grid.insertAdjacentHTML('beforeend', bannerHtml);

    catRenderIndex = 0;
    loadMoreCategories();

    if (bannerHtml) initBannerCarousels();
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
      <div class="category-section ${cat.isPromoSection ? 'is-promo-section' : ''}">
        <div class="category-section-header">
          <div class="category-section-title">
            <i class="fa-solid ${cat.icon}"></i>
            <span>${cat.name}</span>
          </div>
          <button class="category-section-viewall" onclick="selectCategoryDirectly('${cat.id}')">
            <span>Lihat Semua</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="category-section-grid">
          ${productCardsHtml}
        </div>
      </div>
    `;
  }).join('');

  grid.insertAdjacentHTML('beforeend', html);
  catRenderIndex += CAT_RENDER_BATCH;
}

/**
 * =========================================================================
 * PROMO BANNER (Homepage - hanya tampil di mode "Semua Kategori")
 * =========================================================================
 * 3 slot: 1 landscape (rectangle, paling atas) + 2 kotak berdampingan di bawahnya.
 * Tiap slot bisa berisi lebih dari 1 gambar -> otomatis jadi carousel yang bisa
 * di-swipe pengguna dan auto-swipe berkala, lengkap dengan indikator titik (dots).
 */

function getBannerSectionHtml() {
  const landscape = (allBanners.landscape || []).filter(Boolean);
  const square1 = (allBanners.square1 || []).filter(Boolean);
  const square2 = (allBanners.square2 || []).filter(Boolean);

  if (landscape.length === 0 && square1.length === 0 && square2.length === 0) {
    return '';
  }

  const landscapeHtml = landscape.length > 0
    ? renderBannerCarouselHtml('landscape', landscape, 'landscape')
    : '';

  const squareRowHtml = (square1.length > 0 || square2.length > 0)
    ? `
      <div class="banner-square-row">
        ${square1.length > 0 ? renderBannerCarouselHtml('square1', square1, 'square') : ''}
        ${square2.length > 0 ? renderBannerCarouselHtml('square2', square2, 'square') : ''}
      </div>
    `
    : '';

  return `
    <div class="promo-banner-section" id="promo-banner-section">
      ${landscapeHtml}
      ${squareRowHtml}
    </div>
  `;
}

function renderBannerCarouselHtml(slotId, images, variant) {
  const slidesHtml = images.map(url => `
    <div class="banner-slide">
      <img src="${url}" alt="Banner Promo" loading="lazy">
    </div>
  `).join('');

  const dotsHtml = images.length > 1
    ? `
      <div class="banner-dots">
        ${images.map((_, i) => `<span class="banner-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
      </div>
    `
    : '';

  return `
    <div class="banner-carousel banner-carousel-${variant}" data-slot="${slotId}">
      <div class="banner-track">
        ${slidesHtml}
      </div>
      ${dotsHtml}
    </div>
  `;
}

function clearBannerTimers() {
  bannerAutoTimers.forEach(timer => clearInterval(timer));
  bannerAutoTimers = [];
}

function initBannerCarousels() {
  clearBannerTimers();

  document.querySelectorAll('.banner-carousel').forEach(carousel => {
    const track = carousel.querySelector('.banner-track');
    const dotsWrap = carousel.querySelector('.banner-dots');
    const slides = track ? track.querySelectorAll('.banner-slide') : [];
    if (!track || slides.length === 0) return;

    // Sinkronkan indikator titik saat pengguna swipe manual
    if (dotsWrap) {
      track.addEventListener('scroll', () => {
        if (!track.clientWidth) return;
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        dotsWrap.querySelectorAll('.banner-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === idx);
        });
      }, { passive: true });
    }

    // Auto-swipe berkala setiap beberapa detik jika slot punya lebih dari 1 gambar
    if (slides.length > 1) {
      const timer = setInterval(() => {
        if (!track.isConnected) {
          clearInterval(timer);
          return;
        }
        const current = Math.round(track.scrollLeft / track.clientWidth);
        const next = (current + 1) % slides.length;
        track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
      }, 4500);
      bannerAutoTimers.push(timer);
    }
  });
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
  document.getElementById('modal-item-desc').textContent = product.description || '-';
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

  // Badge jumlah item di tab "Keranjang" pada bottom nav
  const navBadge = document.getElementById('bottom-nav-cart-badge');
  if (navBadge) {
    navBadge.textContent = totalCount;
    navBadge.style.display = totalCount > 0 ? 'flex' : 'none';
  }

  // Tombol checkout & total di halaman Keranjang
  const btnPageCheckout = document.getElementById('btn-page-checkout');
  if (btnPageCheckout) btnPageCheckout.disabled = totalCount === 0;

  const pageCartTotal = document.getElementById('page-cart-total-price');
  if (pageCartTotal) pageCartTotal.textContent = Store.formatCurrency(totalPrice);

  const cartItemList = document.getElementById('page-cart-items');

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

/**
 * Berpindah tab bawah: 'home' | 'cart' | 'history'.
 * Menyembunyikan/menampilkan view terkait dan me-render ulang kontennya jika perlu.
 */
function switchView(view) {
  document.querySelectorAll('.kiosk-view').forEach(el => {
    el.classList.toggle('active', el.id === `view-${view}`);
  });

  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === view);
  });

  // Sembunyikan tombol mengambang WA sementara di tab Keranjang, karena
  // posisinya menutupi tombol Checkout pada halaman tersebut.
  const waFloatBtn = document.getElementById('btn-wa-float');
  if (waFloatBtn) {
    waFloatBtn.classList.toggle('is-hidden', view === 'cart');
  }

  if (view === 'cart') {
    renderCartUI();
  } else if (view === 'history') {
    renderHistoryPage();
  }
}

/**
 * Render tab "Riwayat": daftar pesanan yang pernah dibuat dari perangkat ini
 * (Store.getMyOrderHistory(), disimpan di localStorage saat "Kirim Pesanan" berhasil).
 */
function renderHistoryPage() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  const history = Store.getMyOrderHistory();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1.25rem; color: var(--gray-500);">
        <i class="fa-solid fa-receipt" style="font-size: 2.5rem; margin-bottom: 0.6rem; color: var(--gray-300); display: block;"></i>
        <p style="font-size: 0.9rem; font-weight: 600;">Belum ada riwayat pesanan.</p>
        <span style="font-size: 0.8rem;">Pesanan yang Anda kirim akan muncul di sini.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(order => {
    const dateLabel = new Date(order.createdAt).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const statusMeta = Store.ORDER_STATUSES[String(order.status || '').toUpperCase()];
    const statusLabel = statusMeta ? statusMeta.label : order.status;

    return `
      <div class="history-item-card">
        <div class="history-item-top">
          <div>
            <div class="history-item-id">${order.id}</div>
            <div class="history-item-date">${dateLabel}</div>
          </div>
          <span class="history-item-status status-${order.status}">${statusLabel}</span>
        </div>
        <div class="history-item-meta">
          <span>${order.totalCount} barang</span>
          <span class="history-item-total">${Store.formatCurrency(order.totalPrice)}</span>
        </div>
        <a href="${Store.getOrderTrackingUrl(order.id)}" target="_blank" class="history-item-track-btn">
          <i class="fa-solid fa-location-dot"></i>
          <span>Lacak Pesanan</span>
        </a>
      </div>
    `;
  }).join('');
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

/**
 * Tombol "Gunakan Lokasi Saat Ini" pada form Alamat Pengiriman.
 * Menggunakan Geolocation API browser untuk mengisi field alamat dengan
 * tautan Google Maps ke posisi pelanggan (butuh HTTPS/localhost & izin lokasi).
 */
function setupLocationButton() {
  const btn = document.getElementById('btn-use-location');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Perangkat/browser Anda tidak mendukung deteksi lokasi', 'error');
      return;
    }

    const icon = btn.querySelector('i');
    const label = btn.querySelector('span');
    const originalLabel = label ? label.textContent : '';

    const setLoadingState = (isLoading) => {
      btn.disabled = isLoading;
      if (icon) icon.classList.toggle('fa-spin', isLoading);
      if (label) label.textContent = isLoading ? 'Mendeteksi lokasi...' : originalLabel;
    };

    setLoadingState(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        const addressInput = document.getElementById('cust-address');
        if (addressInput) {
          addressInput.value = mapsUrl;
          updateOrderPreview();
        }

        showToast('Lokasi berhasil ditambahkan ke Alamat Pengiriman', 'success');
        setLoadingState(false);
      },
      (err) => {
        console.error('Gagal mendapatkan lokasi:', err);
        let msg = 'Gagal mendapatkan lokasi Anda.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Izin lokasi ditolak. Mohon izinkan akses lokasi di pengaturan browser.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Waktu deteksi lokasi habis, silakan coba lagi.';
        }
        showToast(msg, 'error');
        setLoadingState(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
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

  // Simpan ke riwayat pesanan lokal perangkat ini agar muncul di tab "Riwayat"
  Store.addToMyOrderHistory(order);

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
