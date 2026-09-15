/**
 * admin.js - Inventory & Order Management Controller (Bahasa Indonesia)
 * Mengelola daftar produk, filter status stok & kategori, pencarian real-time,
 * upload & preview foto produk, manajemen status pesanan (Order Status: received, preparing, delivering, completed),
 * serta modal tambah/edit produk dengan penanda TODO backend.
 * 
 * Update: Menambahkan multiline product cards dengan gambar produk yang lebih besar.
 */

let adminProducts = [];
let adminCategories = [];
let adminOrders = [];
let adminBanners = { landscape: [], square1: [], square2: [] };
let currentAdminTab = 'products'; // 'products' | 'orders' | 'banners'
let editingProductId = null;
let currentUploadedImageData = null;

// Variabel state untuk Progressive Rendering / Infinite Scroll produk
let renderPage = 1;
const ITEMS_PER_PAGE = 15;
let currentFilteredProducts = [];
let productTableObserver = null;

// Variabel state untuk Progressive Rendering / Infinite Scroll pesanan
let renderOrderPage = 1;
const ORDERS_PER_PAGE = 15;
let currentFilteredOrders = [];
let orderTableObserver = null;

document.addEventListener('DOMContentLoaded', async () => {
  Store.loadToken();

  Store.onUnauthorized = function() {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById('modal-login');
      const form = document.getElementById('login-form');

      modal.classList.add('active');

      form.onsubmit = async (e) => {
        e.preventDefault();

        const data = new FormData(form);

        try {
          const res = await fetch('api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: data.get('username'),
              password: data.get('password'),
            }),
          });

          if (!res.ok) {
            throw new Error('Login failed');
          }

          const result = await res.json();
          Store.saveToken(result.token);

          modal.classList.remove('active');
          resolve();
        } catch (err) {
          console.error('Login failed:', err);
          alert('Username atau password salah.');
        }
      };
    });
  };

  await loadAdminData();
  setupAdminListeners();
  setupImageUploadHandlers();
});

async function loadAdminData(local = false) {
  try {
    adminCategories = await Store.getCategories(local);
    adminProducts = await Store.getProducts(local);
    adminOrders = await Store.getOrders(local);
    if (!local)
      populateCategoryDropdowns();
    renderStats();
    renderTable();
    renderOrdersTable();
    updateOrdersBadge();

    // Banner promo bersifat non-kritikal: jika endpoint backend-nya belum siap,
    // tab lain (Produk/Pesanan) tetap berfungsi normal.
    try {
      adminBanners = await Store.getBanners(local);
    } catch (bannerErr) {
      console.warn('Gagal memuat banner promo (opsional):', bannerErr);
    }
    renderBannerManager();
  } catch (err) {
    console.error('Gagal memuat data admin inventaris & pesanan:', err);
    alert('Terjadi kesalahan saat memuat data toko.');
  }
}

function updateOrdersBadge() {
  const badge = document.getElementById('nav-badge-orders');
  if (badge) {
    const activeCount = adminOrders.filter(o => o.status !== 'completed').length;
    badge.textContent = activeCount;
  }
}

window.switchAdminTab = function(tabName) {
  currentAdminTab = tabName;

  // Update nav buttons active state
  document.getElementById('nav-tab-products')?.classList.toggle('active', tabName === 'products');
  document.getElementById('nav-tab-orders')?.classList.toggle('active', tabName === 'orders');
  document.getElementById('nav-tab-banners')?.classList.toggle('active', tabName === 'banners');

  // Update tab views
  document.getElementById('tab-view-products')?.classList.toggle('active', tabName === 'products');
  document.getElementById('tab-view-orders')?.classList.toggle('active', tabName === 'orders');
  document.getElementById('tab-view-banners')?.classList.toggle('active', tabName === 'banners');

  // Update header text and actions button
  const titleEl = document.getElementById('admin-view-title');
  const subEl = document.getElementById('admin-view-subtitle');
  const btnAddProduct = document.getElementById('btn-add-product');
  const titleMobile = document.getElementById('admin-view-title-mobile');
  const btnAddMobile = document.getElementById('btn-add-product-mobile');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnUploadCsv = document.getElementById('btn-upload-csv');
  const btnDownloadCsvMobile = document.getElementById('btn-download-csv-mobile');
  const btnUploadCsvMobile = document.getElementById('btn-upload-csv-mobile');

  // Tombol Tambah Produk & Download/Upload CSV hanya relevan di tab Produk
  const isProductsTab = tabName === 'products';
  if (btnAddProduct) btnAddProduct.style.display = isProductsTab ? 'flex' : 'none';
  if (btnAddMobile) btnAddMobile.style.display = isProductsTab ? 'flex' : 'none';
  if (btnDownloadCsv) btnDownloadCsv.style.display = isProductsTab ? 'flex' : 'none';
  if (btnUploadCsv) btnUploadCsv.style.display = isProductsTab ? 'flex' : 'none';
  if (btnDownloadCsvMobile) btnDownloadCsvMobile.style.display = isProductsTab ? 'flex' : 'none';
  if (btnUploadCsvMobile) btnUploadCsvMobile.style.display = isProductsTab ? 'flex' : 'none';

  if (tabName === 'products') {
    if (titleEl) titleEl.textContent = 'Manajemen Inventaris & Katalog';
    if (subEl) subEl.textContent = 'Kelola daftar barang, satuan, harga jual, dan sisa stok toko Rama.';
    if (titleMobile) titleMobile.textContent = 'Kelola Produk';
  } else if (tabName === 'banners') {
    if (titleEl) titleEl.textContent = 'Banner Promo Homepage';
    if (subEl) subEl.textContent = 'Atur gambar banner promo yang tampil di halaman utama aplikasi pemesanan.';
    if (titleMobile) titleMobile.textContent = 'Banner Promo';
  } else {
    if (titleEl) titleEl.textContent = 'Manajemen & Status Pesanan Pelanggan';
    if (subEl) subEl.textContent = 'Pantau dan ubah alur status pesanan (Diterima ➔ Disiapkan ➔ Diantar ➔ Selesai).';
    if (titleMobile) titleMobile.textContent = 'Status Pesanan';
  }
};

function setupAdminListeners() {
  // Input pencarian produk
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTable();
    });
  }

  // Filter kategori produk
  const catFilter = document.getElementById('admin-cat-filter');
  if (catFilter) {
    catFilter.addEventListener('change', () => {
      renderTable();
    });
  }

  // Input pencarian pesanan
  const orderSearchInput = document.getElementById('admin-order-search');
  if (orderSearchInput) {
    orderSearchInput.addEventListener('input', () => {
      renderOrdersTable();
    });
  }

  // Filter status pesanan
  const orderStatusFilter = document.getElementById('admin-order-status-filter');
  if (orderStatusFilter) {
    orderStatusFilter.addEventListener('change', () => {
      renderOrdersTable();
    });
  }

  // Tombol Tambah Produk
  const btnAdd = document.getElementById('btn-add-product');
  if (btnAdd) {
    btnAdd.addEventListener('click', openAddProductModal);
  }

  // Tombol Download CSV & Upload CSV (memicu modal verifikasi admin dulu)
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener('click', () => openCsvAuthModal('download'));
  }

  const btnUploadCsv = document.getElementById('btn-upload-csv');
  if (btnUploadCsv) {
    btnUploadCsv.addEventListener('click', () => openCsvAuthModal('upload'));
  }

  // Submit form verifikasi admin untuk CSV (download / upload)
  const csvAuthForm = document.getElementById('csv-auth-form');
  if (csvAuthForm) {
    csvAuthForm.addEventListener('submit', handleCsvAuthSubmit);
  }

  // Tombol Reset Data Demo
  const btnReset = document.getElementById('btn-reset-demo');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (confirm('Kembalikan semua data inventaris dan pesanan ke data bawaan demo?')) {
        await Store.resetToDefault();
        await loadAdminData();
        alert('Data berhasil dikembalikan ke default demo.');
      }
    });
  }

  // Submit Form Produk
  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductFormSubmit);
  }

  // Tutup modal pada backdrop click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Listener jika ada update pesanan dari tab lain
  window.addEventListener('orders-updated', async () => {
    adminOrders = await Store.getOrders(true);
    renderStats();
    renderOrdersTable();
    updateOrdersBadge();
  });

  const priceInput = document.getElementById('prod-price');
  const discountInput = document.getElementById('prod-discount');
  const salePriceInput = document.getElementById('prod-sale-price');

  function calculateSalePrice() {
    const price = Number(priceInput.value) || 0;
    const discount = Number(discountInput.value) || 0;

    const salePrice = price * (1 - discount / 100);

    salePriceInput.value = Math.round(salePrice);
  }

  if (priceInput && discountInput && salePriceInput) {
    priceInput.addEventListener('input', calculateSalePrice);
    discountInput.addEventListener('input', calculateSalePrice);
  }

  // Tombol "Tambah Gambar" per slot banner promo
  document.querySelectorAll('.banner-file-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const slot = e.target.getAttribute('data-slot');
      const file = e.target.files?.[0];
      e.target.value = ''; // reset supaya bisa pilih file yang sama lagi nanti
      if (!file || !slot) return;
      await handleAddBannerImage(slot, file);
    });
  });

  // Delegasi klik untuk tombol hapus & pindah urutan gambar di tiap slot
  document.querySelectorAll('.banner-image-list').forEach(list => {
    list.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.btn-banner-delete');
      const moveBtn = e.target.closest('.btn-banner-move');

      if (deleteBtn) {
        const item = deleteBtn.closest('.banner-image-item');
        const slot = item?.getAttribute('data-slot');
        const index = Number(item?.getAttribute('data-index'));
        if (slot != null && !Number.isNaN(index)) {
          await handleDeleteBannerImage(slot, index);
        }
      } else if (moveBtn) {
        const item = moveBtn.closest('.banner-image-item');
        const slot = item?.getAttribute('data-slot');
        const index = Number(item?.getAttribute('data-index'));
        const dir = Number(moveBtn.getAttribute('data-dir'));
        if (slot != null && !Number.isNaN(index)) {
          await handleMoveBannerImage(slot, index, dir);
        }
      }
    });
  });
}

function setupImageUploadHandlers() {
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('prod-image-file');
  const btnRemoveImg = document.getElementById('btn-remove-img');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedImageFile(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', async (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedImageFile(e.dataTransfer.files[0]);
    }
  });

  if (btnRemoveImg) {
    btnRemoveImg.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImagePreview();
    });
  }
}

async function processSelectedImageFile(file) {
  try {
    const uploadResult = await Store.uploadImage(file);
    if (uploadResult && uploadResult.url) {
      setImagePreview(uploadResult.url);
    }
  } catch (err) {
    alert(err.message || 'Gagal memproses gambar');
  }
}

function setImagePreview(imageUrl) {
  currentUploadedImageData = imageUrl;
  const previewBox = document.getElementById('image-preview-box');
  const previewImg = document.getElementById('image-preview-img');
  const hiddenInput = document.getElementById('prod-image-data');

  if (previewBox && previewImg) {
    previewImg.src = imageUrl;
    previewImg.style.display = 'block';
    previewBox.classList.add('has-image');
  }
  if (hiddenInput) {
    hiddenInput.value = imageUrl;
  }
}

function resetImagePreview() {
  currentUploadedImageData = null;
  const previewBox = document.getElementById('image-preview-box');
  const previewImg = document.getElementById('image-preview-img');
  const hiddenInput = document.getElementById('prod-image-data');
  const fileInput = document.getElementById('prod-image-file');

  if (previewBox && previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewBox.classList.remove('has-image');
  }
  if (hiddenInput) hiddenInput.value = '';
  if (fileInput) fileInput.value = '';
}

function populateCategoryDropdowns() {
  const filterSelect = document.getElementById('admin-cat-filter');
  const formCatSelect = document.getElementById('prod-category');

  if (filterSelect) {
    // "promo" adalah pseudo-kategori (bukan kategori asli di database):
    // menampilkan semua produk yang memiliki discount > 0.
    filterSelect.innerHTML = '<option value="all">Semua Kategori</option>' +
      '<option value="promo">🔥 Promo</option>' +
      adminCategories
        .filter(c => c.id !== 'all')
        .map(c => `<option value="${c.id}">${c.id}</option>`)
        .join('');
  }

  if (formCatSelect) {
    formCatSelect.innerHTML = adminCategories
      .filter(c => c.id !== 'all')
      .map(c => `<option value="${c.id}">${c.id}</option>`)
      .join('');
  }
}

function renderStats() {
  // Produk stats
  const totalProductsEl = document.getElementById('stat-total-products');
  const lowStockEl = document.getElementById('stat-low-stock');
  const totalCategoriesEl = document.getElementById('stat-total-categories');

  if (totalProductsEl) totalProductsEl.textContent = adminProducts.length;
  if (lowStockEl) {
    const lowCount = adminProducts.filter(p => p.stock <= 5).length;
    lowStockEl.textContent = lowCount;
  }
  if (totalCategoriesEl) {
    totalCategoriesEl.textContent = adminCategories.filter(c => c.id !== 'all').length;
  }

  // Pesanan stats
  const receivedEl = document.getElementById('stat-orders-received');
  const preparingEl = document.getElementById('stat-orders-preparing');
  const deliveringEl = document.getElementById('stat-orders-delivering');
  const completedEl = document.getElementById('stat-orders-completed');

  if (receivedEl) receivedEl.textContent = adminOrders.filter(o => o.status === 'received').length;
  if (preparingEl) preparingEl.textContent = adminOrders.filter(o => o.status === 'preparing').length;
  if (deliveringEl) deliveringEl.textContent = adminOrders.filter(o => o.status === 'delivering').length;
  if (completedEl) completedEl.textContent = adminOrders.filter(o => o.status === 'completed').length;
}

/**
 * Inisialisasi tabel produk dan menyaring data berdasarkan pencarian & filter.
 * Menggunakan progressive rendering agar item dimuat secara bertahap saat scroll.
 */
function renderTable() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

  const search = (document.getElementById('admin-search-input')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('admin-cat-filter')?.value || 'all';

  let filtered = adminProducts;

  if (cat === 'promo') {
    filtered = filtered.filter(p => Number(p.discount || 0) > 0);
  } else if (cat !== 'all') {
    filtered = filtered.filter(p => p.category === cat);
  }

  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.description && p.description.toLowerCase().includes(search))
    );
  }

  currentFilteredProducts = filtered;
  renderPage = 1;

  if (productTableObserver) {
    productTableObserver.disconnect();
    productTableObserver = null;
  }

  if (currentFilteredProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--admin-text-muted);">
          <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
          Tidak ada produk yang cocok dengan pencarian atau filter yang dipilih.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  renderProductBatch();
}

/**
 * Mengembalikan batch produk dengan desain kartu multiline dan thumbnail gambar yang besar.
 */
function renderProductBatch() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

  const existingSentinel = document.getElementById('admin-sentinel-row');
  if (existingSentinel) {
    existingSentinel.remove();
  }

  const start = (renderPage - 1) * ITEMS_PER_PAGE;
  const batch = currentFilteredProducts.slice(start, start + ITEMS_PER_PAGE);

  if (batch.length === 0) return;

  const batchHtml = batch.map(p => {
    const catObj = adminCategories.find(c => c.id === p.category);
    const catName = p.category;
    const catIcon = catObj ? catObj.icon : 'fa-box';

    const imageURL = Store.getProductImage(p)
    const thumbHtml = imageURL
      ? `<img src="${imageURL}" alt="${p.name}">`
      : `<i class="fa-solid ${catIcon}"></i>`;

    const discount = Number(p.discount || 0);

    const priceHtml = discount === 0
      ? `
        <span class="price-main">${Store.formatCurrency(p.price)}</span> 
        <span class="price-unit">/ ${p.unit || 'item'}</span>
      `
      : `
        <span class="price-strike">${Store.formatCurrency(p.price)}</span>
        <span class="discount-badge">-${discount}%</span>
        <span class="price-main price-sale">${Store.formatCurrency(p.salePrice)}</span>
        <span class="price-unit">/ ${p.unit || 'item'}</span>
      `;

    return `
      <tr class="product-row">
        <td colspan="5" class="product-table-td">
          <div class="product-item-wrapper">
            <div class="item-thumb-icon">
              ${thumbHtml}
            </div>
            <div class="item-info-body">
              <div class="item-top-row">
                <div class="item-title-group">
                  <h3 class="item-name">${p.name}</h3>
                  <span class="category-badge">${catName}</span>
                </div>
                <span class="sku-badge"><i class="fa-solid"></i> <code>${p.id}</code></span>
              </div>
              <p class="item-desc">${p.description || 'Tidak ada deskripsi produk.'}</p>
              <div class="item-bottom-row">
                <div class="item-price-wrapper">
                  ${priceHtml}
                </div>
                <div class="table-actions">
                  <button class="btn-tbl-action btn-edit" onclick="openEditProductModal('${p.id}')" title="Edit Produk">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>Edit</span>
                  </button>
                  <button class="btn-tbl-action delete" onclick="handleDeleteProduct('${p.id}')" title="Hapus Produk">
                    <i class="fa-solid fa-trash"></i>
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', batchHtml);

  const loadedCount = start + batch.length;
  const hasMore = loadedCount < currentFilteredProducts.length;

  if (hasMore) {
    const sentinelTr = document.createElement('tr');
    sentinelTr.id = 'admin-sentinel-row';
    sentinelTr.innerHTML = `
      <td colspan="5" style="text-align: center; padding: 1.25rem; color: var(--admin-text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>
        Memuat produk berikutnya (${loadedCount} dari ${currentFilteredProducts.length})...
      </td>
    `;
    tbody.appendChild(sentinelTr);

    setupProductSentinelObserver(sentinelTr);
  }
}

function setupProductSentinelObserver(sentinelElement) {
  if (productTableObserver) {
    productTableObserver.disconnect();
  }

  productTableObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry && entry.isIntersecting) {
      productTableObserver.disconnect();
      renderPage++;
      renderProductBatch();
    }
  }, {
    root: null,
    rootMargin: '150px',
    threshold: 0.1
  });

  productTableObserver.observe(sentinelElement);
}

function renderOrdersTable() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  const search = (document.getElementById('admin-order-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('admin-order-status-filter')?.value || 'all';

  let filtered = adminOrders;

  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(o =>
      o.id.toLowerCase().includes(search) ||
      (o.customer.name && o.customer.name.toLowerCase().includes(search)) ||
      (o.customer.phone && o.customer.phone.includes(search)) ||
      (o.customer.address && o.customer.address.toLowerCase().includes(search))
    );
  }

  currentFilteredOrders = filtered;
  renderOrderPage = 1;

  if (orderTableObserver) {
    orderTableObserver.disconnect();
    orderTableObserver = null;
  }

  if (currentFilteredOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--admin-text-muted);">
          <i class="fa-solid fa-clipboard-question" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
          Tidak ada data pesanan yang cocok dengan pencarian atau filter status.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  renderOrderBatch();
}

function renderOrderBatch() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  const existingSentinel = document.getElementById('admin-order-sentinel-row');
  if (existingSentinel) {
    existingSentinel.remove();
  }

  const start = (renderOrderPage - 1) * ORDERS_PER_PAGE;
  const batch = currentFilteredOrders.slice(start, start + ORDERS_PER_PAGE);

  if (batch.length === 0) return;

  const batchHtml = batch.map(order => {
    const statusMeta = Store.ORDER_STATUSES[order.status.toUpperCase()] || { label: order.status, icon: 'fa-circle' };
    const dateStr = new Date(order.createdAt).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    return `
      <tr>
        <td>
          <div><strong>${order.id}</strong></div>
          <div style="font-size: 0.75rem; color: var(--admin-text-muted);"><i class="fa-regular fa-clock"></i> ${dateStr}</div>
        </td>
        <td>
          <div><strong>${order.customer.name || '-'}</strong></div>
          <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${order.customer.phone ? `<i class="fa-brands fa-whatsapp"></i> ${order.customer.phone}` : 'Tanpa No. WA'}</div>
          ${order.customer.address ? `<div style="font-size: 0.7rem; color: #64748b; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class="fa-solid fa-location-dot"></i> ${order.customer.address}</div>` : ''}
        </td>
        <td>
          <div><strong>${Store.formatCurrency(order.totalPrice)}</strong></div>
          <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${order.totalCount} item barang</div>
        </td>
        <td>
          <span class="order-status-badge status-${order.status}">
            <i class="fa-solid ${statusMeta.icon}"></i>
            <span>${statusMeta.label}</span>
          </span>
        </td>
        <td>
          <select class="status-select-btn" onchange="handleUpdateOrderStatus('${order.id}', this.value)">
            <option value="received" ${order.status === 'received' ? 'selected' : ''}>Diterima (Received)</option>
            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Disiapkan (Preparing)</option>
            <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Diantar (Delivering)</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Selesai (Completed)</option>
          </select>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-tbl-action" onclick="openOrderDetailModal('${order.id}')" title="Lihat Rincian Pesanan">
              <i class="fa-solid fa-eye"></i>
            </button>
            <a href="order.html?id=${order.id}" target="_blank" class="btn-tbl-action" title="Buka Halaman Pantau Pelanggan">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <button class="btn-tbl-action delete" onclick="handleDeleteOrder('${order.id}')" title="Hapus Pesanan">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', batchHtml);

  const loadedCount = start + batch.length;
  const hasMore = loadedCount < currentFilteredOrders.length;

  if (hasMore) {
    const sentinelTr = document.createElement('tr');
    sentinelTr.id = 'admin-order-sentinel-row';
    sentinelTr.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 1.25rem; color: var(--admin-text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i>
        Memuat pesanan berikutnya (${loadedCount} dari ${currentFilteredOrders.length})...
      </td>
    `;
    tbody.appendChild(sentinelTr);

    setupOrderSentinelObserver(sentinelTr);
  }
}

function setupOrderSentinelObserver(sentinelElement) {
  if (orderTableObserver) {
    orderTableObserver.disconnect();
  }

  orderTableObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry && entry.isIntersecting) {
      orderTableObserver.disconnect();
      renderOrderPage++;
      renderOrderBatch();
    }
  }, {
    root: null,
    rootMargin: '150px',
    threshold: 0.1
  });

  orderTableObserver.observe(sentinelElement);
}

window.handleUpdateOrderStatus = async function(orderId, newStatus) {
  try {
    await Store.updateOrderStatus(orderId, newStatus);
    adminOrders = await Store.getOrders(true);
    renderStats();
    renderOrdersTable();
    updateOrdersBadge();
  } catch (err) {
    console.error('Error updating order status:', err);
    alert('Gagal mengubah status pesanan: ' + err.message);
  }
};

window.handleDeleteOrder = async function(orderId) {
  if (confirm(`Hapus data pesanan ${orderId}?`)) {
    try {
      await Store.deleteOrder(orderId);
      adminOrders = await Store.getOrders(true);
      renderStats();
      renderOrdersTable();
      updateOrdersBadge();
    } catch (err) {
      alert('Gagal menghapus pesanan: ' + err.message);
    }
  }
};

window.openOrderDetailModal = async function(orderId) {
  const order = await Store.getOrderById(orderId);
  if (!order) return;

  const contentEl = document.getElementById('modal-order-content');
  const titleEl = document.getElementById('modal-order-title');
  if (titleEl) titleEl.textContent = `Rincian Pesanan #${order.id}`;

  const statusMeta = Store.ORDER_STATUSES[order.status.toUpperCase()] || { label: order.status, icon: 'fa-circle' };
  const dateStr = new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

  if (contentEl) {
    contentEl.innerHTML = `
      <div style="background: var(--gray-50); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.8rem; color: var(--admin-text-muted);">Status Saat Ini:</span>
          <span class="order-status-badge status-${order.status}">
            <i class="fa-solid ${statusMeta.icon}"></i> ${statusMeta.label}
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--admin-text-muted);">Waktu: ${dateStr}</div>
      </div>

      <div style="margin-bottom: 1rem;">
        <h4 style="font-size: 0.9rem; font-weight: 800; margin-bottom: 0.5rem;">Informasi Pemesan:</h4>
        <div style="font-size: 0.85rem; line-height: 1.5; color: var(--admin-text-main);">
          <div>• <strong>Nama:</strong> ${order.customer.name || '-'}</div>
          <div>• <strong>WhatsApp:</strong> ${order.customer.phone || '-'}</div>
          <div>• <strong>Alamat:</strong> ${order.customer.address || '-'}</div>
          ${order.customer.notes ? `<div>• <strong>Catatan:</strong> <em>${order.customer.notes}</em></div>` : ''}
        </div>
      </div>

      <div>
        <h4 style="font-size: 0.9rem; font-weight: 800; margin-bottom: 0.5rem;">Daftar Item (${order.totalCount}):</h4>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${order.items.map((item, idx) => {
      const product = Store.getProductById(item.id);
      const barcodeValue = product?.barcode || '';

      return `
              <div style="padding: 0.6rem 0.8rem; background: #fff; border: 1px solid var(--admin-border); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                      <span>${idx + 1}. ${item.name}</span>
                      ${barcodeValue ? `
                        <button type="button" 
                                onclick="toggleItemBarcode('${idx}', '${barcodeValue}')"
                                style="background: var(--gray-100, #f1f5f9); border: 1px solid var(--admin-border); border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.75rem;">
                          <i class="fa-solid">Show barcode</i>
                        </button>
                      ` : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${item.quantity} ${item.unit} x ${Store.formatCurrency(item.price)}</div>
                    ${item.notes ? `<div style="font-size: 0.7rem; color: var(--admin-accent); font-style: italic;">Catatan: ${item.notes}</div>` : ''}
                  </div>
                  <div style="font-weight: 800; font-size: 0.9rem;">${Store.formatCurrency(item.price * item.quantity)}</div>
                </div>
                ${barcodeValue ? `
                  <div id="barcode-container-${idx}" style="display: none; text-align: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--admin-border);">
                    <svg id="barcode-svg-${idx}"></svg>
                  </div>
                ` : ''}
              </div>
            `;
    }).join('')}
        </div>
      </div>

      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--admin-border); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 800;">Total Pembayaran:</span>
        <span style="font-size: 1.25rem; font-weight: 800; color: var(--admin-accent);">${Store.formatCurrency(order.totalPrice)}</span>
      </div>
    `;
  }

  const modal = document.getElementById('modal-order-detail');
  if (modal) modal.classList.add('active');
};

window.toggleItemBarcode = function(index, barcodeValue) {
  const container = document.getElementById(`barcode-container-${index}`);
  if (!container) return;

  const isHidden = container.style.display === 'none';
  if (isHidden) {
    container.style.display = 'block';
    const svgId = `#barcode-svg-${index}`;
    if (typeof JsBarcode !== 'undefined') {
      JsBarcode(svgId, barcodeValue, {
        format: "EAN13",
        flat: true,
        width: 1.5,
        height: 45,
        fontSize: 12,
        margin: 5
      });
    }
  } else {
    container.style.display = 'none';
  }
};

// Menyimpan mode modal verifikasi CSV yang sedang aktif ('download' | 'upload')
let pendingCsvAction = null;

/**
 * Membuka modal verifikasi admin sebelum menjalankan aksi Download/Upload CSV.
 * Ini adalah lapisan keamanan tambahan di sisi klien (re-auth password) sebelum
 * memicu operasi sensitif yang menyentuh seluruh data katalog produk.
 * @param {'download'|'upload'} mode
 */
function openCsvAuthModal(mode) {
  pendingCsvAction = mode;

  const title = document.getElementById('csv-auth-title');
  const warningText = document.getElementById('csv-auth-warning-text');
  const fileGroup = document.getElementById('csv-auth-file-group');
  const fileInput = document.getElementById('csv-auth-file');
  const submitBtn = document.getElementById('csv-auth-submit-btn');
  const passwordInput = document.getElementById('csv-auth-password');

  if (mode === 'upload') {
    if (title) title.textContent = 'Verifikasi Admin — Upload CSV';
    if (warningText) warningText.textContent = 'Mengunggah file CSV akan mengubah/menimpa data produk di katalog. Masukkan password admin dan pilih file CSV untuk melanjutkan.';
    if (fileGroup) fileGroup.style.display = '';
    if (fileInput) { fileInput.value = ''; fileInput.required = true; }
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-file-arrow-up"></i> <span>Verifikasi &amp; Upload</span>';
  } else {
    if (title) title.textContent = 'Verifikasi Admin — Download CSV';
    if (warningText) warningText.textContent = 'Tindakan ini akan mengunduh seluruh data katalog produk. Masukkan kembali password admin Anda untuk melanjutkan.';
    if (fileGroup) fileGroup.style.display = 'none';
    if (fileInput) { fileInput.value = ''; fileInput.required = false; }
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i> <span>Verifikasi &amp; Download</span>';
  }

  if (passwordInput) passwordInput.value = '';

  const modal = document.getElementById('modal-csv-auth');
  if (modal) modal.classList.add('active');
}

/**
 * Handler submit modal verifikasi CSV. Memanggil Store.downloadCSV() / Store.uploadCSV()
 * (lihat store.js — keduanya masih berupa method TODO menunggu integrasi backend).
 */
async function handleCsvAuthSubmit(e) {
  e.preventDefault();

  const password = document.getElementById('csv-auth-password')?.value || '';
  const submitBtn = document.getElementById('csv-auth-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (pendingCsvAction === 'upload') {
      const fileInput = document.getElementById('csv-auth-file');
      const file = fileInput?.files?.[0];
      if (!file) {
        alert('Silakan pilih file CSV terlebih dahulu.');
        return;
      }
      await Store.uploadCSV(file, password);
      alert('Upload CSV berhasil.');
      await loadAdminData(true);
    } else {
      await Store.downloadCSV(password);
    }
    closeAllModals();
  } catch (err) {
    console.error('Gagal memproses CSV:', err);
    alert('Gagal memproses CSV: ' + err.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    pendingCsvAction = null;
  }
}

/**
 * =========================================================================
 * BANNER PROMO HOMEPAGE — Manajemen 3 slot (landscape, square1, square2)
 * =========================================================================
 */

const BANNER_SLOT_IDS = ['landscape', 'square1', 'square2'];

function renderBannerManager() {
  BANNER_SLOT_IDS.forEach(slotId => {
    const list = document.getElementById(`banner-list-${slotId}`);
    if (!list) return;

    const images = adminBanners[slotId] || [];

    if (images.length === 0) {
      list.innerHTML = `<div class="banner-list-empty">Belum ada gambar di slot ini.</div>`;
      return;
    }

    list.innerHTML = images.map((url, index) => `
      <div class="banner-image-item" data-slot="${slotId}" data-index="${index}">
        <img src="${url}" alt="Banner ${index + 1}">
        <div class="banner-image-item-actions">
          <button type="button" class="btn-banner-move" data-dir="-1" title="Pindah ke urutan sebelumnya" ${index === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <button type="button" class="btn-banner-move" data-dir="1" title="Pindah ke urutan berikutnya" ${index === images.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button type="button" class="btn-banner-delete" title="Hapus Gambar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  });
}

async function persistBanners() {
  try {
    await Store.saveBanners(adminBanners);
  } catch (err) {
    console.error('Gagal menyimpan banner promo:', err);
    alert('Gagal menyimpan perubahan banner: ' + err.message);
  }
}

async function handleAddBannerImage(slot, file) {
  try {
    const uploadResult = await Store.uploadImage(file);
    if (!uploadResult?.url) return;

    if (!Array.isArray(adminBanners[slot])) adminBanners[slot] = [];
    adminBanners[slot].push(uploadResult.url);

    renderBannerManager();
    await persistBanners();
  } catch (err) {
    console.error('Gagal mengunggah gambar banner:', err);
    alert(err.message || 'Gagal mengunggah gambar banner');
  }
}

async function handleDeleteBannerImage(slot, index) {
  if (!Array.isArray(adminBanners[slot])) return;
  adminBanners[slot].splice(index, 1);
  renderBannerManager();
  await persistBanners();
}

async function handleMoveBannerImage(slot, index, dir) {
  const images = adminBanners[slot];
  if (!Array.isArray(images)) return;

  const targetIndex = index + dir;
  if (targetIndex < 0 || targetIndex >= images.length) return;

  [images[index], images[targetIndex]] = [images[targetIndex], images[index]];
  renderBannerManager();
  await persistBanners();
}

function openAddProductModal() {
  editingProductId = null;
  document.getElementById('modal-form-title').textContent = 'Tambah Produk Baru';
  document.getElementById('product-form').reset();
  resetImagePreview();
  const modal = document.getElementById('modal-product-form');
  if (modal) modal.classList.add('active');
}

window.openEditProductModal = function(productId) {
  const product = adminProducts.find(p => p.id === productId);
  if (!product) return;

  editingProductId = productId;
  document.getElementById('modal-form-title').textContent = 'Edit Produk';
  document.getElementById('prod-id').value = product.id;
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-barcode').value = product.barcode;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-unit').value = product.unit;
  document.getElementById('prod-discount').value = product.discount;
  document.getElementById('prod-sale-price').value = product.salePrice;
  document.getElementById('prod-desc').value = product.description || '';

  if (product.image) {
    setImagePreview(product.image);
  } else {
    resetImagePreview();
  }

  const modal = document.getElementById('modal-product-form');
  if (modal) modal.classList.add('active');
};

async function handleProductFormSubmit(e) {
  e.preventDefault();

  const productData = {
    id: document.getElementById('prod-id').value,
    name: document.getElementById('prod-name').value,
    barcode: document.getElementById('prod-barcode').value,
    category: document.getElementById('prod-category').value,
    price: document.getElementById('prod-price').value,
    discount: document.getElementById('prod-discount').value,
    salePrice: document.getElementById('prod-sale-price').value,
    unit: document.getElementById('prod-unit').value,
    image: document.getElementById('prod-image-data').value || null,
    description: document.getElementById('prod-desc').value
  };

  try {
    await Store.patchProduct(productData);

    closeAllModals();
    await loadAdminData(true);
  } catch (err) {
    console.error('Gagal menyimpan produk:', err);
    alert('Gagal menyimpan produk: ' + err.message);
  }
}

window.handleDeleteProduct = async function(productId) {
  const product = adminProducts.find(p => p.id === productId);
  const name = product ? product.name : productId;

  if (confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
    try {
      await Store.deleteProduct(productId);
      await loadAdminData(true);
    } catch (err) {
      console.error('Gagal menghapus produk:', err);
      alert('Gagal menghapus produk: ' + err.message);
    }
  }
};

window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('active');
  });
  editingProductId = null;
  pendingCsvAction = null;
  resetImagePreview();
};
