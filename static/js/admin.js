/**
 * admin.js - Inventory & Order Management Controller (Bahasa Indonesia)
 * Mengelola daftar produk, filter status stok & kategori, pencarian real-time,
 * upload & preview foto produk, manajemen status pesanan (Order Status: received, preparing, delivering, completed),
 * serta modal tambah/edit produk dengan penanda TODO backend.
 * 
 * Update: Menambahkan infinite scroll / progressive batch rendering untuk daftar produk.
 */

let adminProducts = [];
let adminCategories = [];
let adminOrders = [];
let currentAdminTab = 'products'; // 'products' | 'orders'
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

async function loadAdminData() {
  try {
    adminCategories = await Store.getCategories();
    adminProducts = await Store.getProducts();
    adminOrders = await Store.getOrders();
    populateCategoryDropdowns();
    renderStats();
    renderTable();
    renderOrdersTable();
    updateOrdersBadge();
  } catch (err) {
    console.error('Gagal memuat data admin inventaris & pesanan:', err);
    alert('Terjadi kesalahan saat memuat data toko.');
  }
}

function updateOrdersBadge() {
  const badge = document.getElementById('nav-badge-orders');
  if (badge) {
    // Tampilkan jumlah pesanan aktif (belum selesai)
    const activeCount = adminOrders.filter(o => o.status !== 'completed').length;
    badge.textContent = activeCount;
  }
}

window.switchAdminTab = function(tabName) {
  currentAdminTab = tabName;

  // Update nav buttons active state
  document.getElementById('nav-tab-products')?.classList.toggle('active', tabName === 'products');
  document.getElementById('nav-tab-orders')?.classList.toggle('active', tabName === 'orders');

  // Update tab views
  document.getElementById('tab-view-products')?.classList.toggle('active', tabName === 'products');
  document.getElementById('tab-view-orders')?.classList.toggle('active', tabName === 'orders');

  // Update header text and actions button
  const titleEl = document.getElementById('admin-view-title');
  const subEl = document.getElementById('admin-view-subtitle');
  const btnAddProduct = document.getElementById('btn-add-product');
  const titleMobile = document.getElementById('admin-view-title-mobile');
  const btnAddMobile = document.getElementById('btn-add-product-mobile');

  if (tabName === 'products') {
    if (titleEl) titleEl.textContent = 'Manajemen Inventaris & Katalog';
    if (subEl) subEl.textContent = 'Kelola daftar barang, satuan, harga jual, dan sisa stok toko Rama.';
    if (titleMobile) titleMobile.textContent = 'Kelola Produk';
    if (btnAddProduct) btnAddProduct.style.display = 'flex';
    if (btnAddMobile) btnAddMobile.style.display = 'flex';
  } else {
    if (titleEl) titleEl.textContent = 'Manajemen & Status Pesanan Pelanggan';
    if (subEl) subEl.textContent = 'Pantau dan ubah alur status pesanan (Diterima ➔ Disiapkan ➔ Diantar ➔ Selesai).';
    if (titleMobile) titleMobile.textContent = 'Status Pesanan';
    if (btnAddProduct) btnAddProduct.style.display = 'none';
    if (btnAddMobile) btnAddMobile.style.display = 'none';
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

  // Filter status stok
  const stockFilter = document.getElementById('admin-stock-filter');
  if (stockFilter) {
    stockFilter.addEventListener('change', () => {
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
    filterSelect.innerHTML = '<option value="all">Semua Kategori</option>' +
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

  if (cat !== 'all') {
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

  // Hentikan observer sebelumnya jika ada
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
 * Menggembalikan batch produk berdasarkan halaman saat ini dan menambahkannya ke tabel.
 */
function renderProductBatch() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

  // Hapus baris pemuat (sentinel) jika ada
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

    const thumbHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}">`
      : `<i class="fa-solid ${catIcon}"></i>`;

    const discount = Number(p.discount || 0);

    const priceHtml = discount === 0
      ? `<strong>${Store.formatCurrency(p.price)}</strong> / ${p.unit || 'item'}`
      : `
      <div>
        <div>
          <span style="text-decoration: line-through; color: var(--admin-text-muted);">
            ${Store.formatCurrency(p.price)}
          </span>
          <span style="margin-left: 0.4rem; color: var(--admin-text-muted);">
            -${discount}%
          </span>
        </div>
        <div>
          <strong>${Store.formatCurrency(p.salePrice)}</strong> / ${p.unit || 'item'}
        </div>
      </div>
    `;

    return `
      <tr>
        <td>
          <div class="item-cell">
            <div class="item-thumb-icon">
              ${thumbHtml}
            </div>
            <div class="item-cell-text">
              <div class="item-name">${p.name}</div>
              <div class="item-desc">${p.description || '-'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="category-badge">${catName}</span>
        </td>
        <td>${priceHtml}</td>
        <td><code>${p.id}</code></td>
        <td>
          <div class="table-actions">
            <button class="btn-tbl-action" onclick="openEditProductModal('${p.id}')" title="Edit Produk">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-tbl-action delete" onclick="handleDeleteProduct('${p.id}')" title="Hapus Produk">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', batchHtml);

  // Periksa apakah masih ada produk yang belum ditampilkan
  const loadedCount = start + batch.length;
  const hasMore = loadedCount < currentFilteredProducts.length;

  if (hasMore) {
    // Tambahkan elemen penanda (sentinel) untuk deteksi scroll
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

/**
 * Menyiapkan IntersectionObserver untuk mendeteksi saat pengguna scroll ke bawah.
 */
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
    rootMargin: '150px', // Memuat batch baru sebelum pengguna benar-benar sampai di dasar
    threshold: 0.1
  });

  productTableObserver.observe(sentinelElement);
}

/**
 * Render Orders Table for Admin
 */
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

  // Hentikan observer sebelumnya jika ada
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

/**
 * Mengembalikan batch pesanan berdasarkan halaman saat ini dan menambahkannya ke tabel.
 */
function renderOrderBatch() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  // Hapus baris pemuat (sentinel) jika ada
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

  // Periksa apakah masih ada pesanan yang belum ditampilkan
  const loadedCount = start + batch.length;
  const hasMore = loadedCount < currentFilteredOrders.length;

  if (hasMore) {
    // Tambahkan elemen penanda (sentinel) untuk deteksi scroll
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

/**
 * Menyiapkan IntersectionObserver untuk mendeteksi saat pengguna scroll ke bawah pada tabel pesanan.
 */
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
          ${order.items.map((item, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.8rem; background: #fff; border: 1px solid var(--admin-border); border-radius: 8px;">
              <div>
                <div style="font-weight: 700; font-size: 0.85rem;">${idx + 1}. ${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${item.quantity} ${item.unit} x ${Store.formatCurrency(item.price)}</div>
                ${item.notes ? `<div style="font-size: 0.7rem; color: var(--admin-accent); font-style: italic;">Catatan: ${item.notes}</div>` : ''}
              </div>
              <div style="font-weight: 800; font-size: 0.9rem;">${Store.formatCurrency(item.price * item.quantity)}</div>
            </div>
          `).join('')}
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
    await loadAdminData();
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
      await loadAdminData();
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
  resetImagePreview();
};
