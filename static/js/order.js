/**
 * order.js - Customer Live Order Tracking Controller
 * Membaca parameter URL `?id=<order-id>`, mengambil data pesanan,
 * menampilkan status stepper timeline (received -> preparing -> delivering -> completed),
 * serta auto-refresh status secara berkala.
 */

let currentOrderId = null;
let currentOrderData = null;
let autoRefreshTimer = null;

const STATUS_STEPS = ['received', 'preparing', 'delivering', 'completed'];

document.addEventListener('DOMContentLoaded', async () => {
  // Ambil parameter order id dari URL (contoh: /order.html?id=RAMA-88219)
  const urlParams = new URLSearchParams(window.location.search);
  const idFromUrl = urlParams.get('id') || urlParams.get('order_id');

  const searchInput = document.getElementById('tracking-search-input');
  const searchForm = document.getElementById('tracking-search-form');

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputVal = searchInput?.value.trim();
      if (inputVal) {
        window.location.search = `?id=${encodeURIComponent(inputVal)}`;
      }
    });
  }

  if (idFromUrl) {
    currentOrderId = idFromUrl.trim();
    if (searchInput) searchInput.value = currentOrderId;
    await loadAndRenderOrder(currentOrderId);
    startAutoRefresh();
  } else {
    renderEmptyState();
  }

  // Live storage event listener untuk auto-update instan jika status diubah di admin tab lain
  window.addEventListener('storage', async (e) => {
    if (e.key === 'rama_customer_orders_v1' && currentOrderId) {
      await loadAndRenderOrder(currentOrderId);
    }
  });

  window.addEventListener('orders-updated', async () => {
    if (currentOrderId) {
      await loadAndRenderOrder(currentOrderId);
    }
  });
});

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  // Auto refresh status setiap 4 detik untuk mensimulasikan pemantauan live
  autoRefreshTimer = setInterval(async () => {
    if (currentOrderId) {
      await loadAndRenderOrder(currentOrderId, true);
    }
  }, 4000);
}

async function loadAndRenderOrder(orderId, isSilent = false) {
  try {
    const order = await Store.getOrderById(orderId);
    if (!order) {
      if (!isSilent) renderNotFoundState(orderId);
      return;
    }
    currentOrderData = order;
    renderOrderDetails(order);
  } catch (err) {
    console.error('Error loading order tracking:', err);
    if (!isSilent) renderNotFoundState(orderId);
  }
}

function renderOrderDetails(order) {
  const container = document.getElementById('tracking-main-content');
  if (!container) return;

  const statusMeta = Store.ORDER_STATUSES[order.status.toUpperCase()] || {
    id: order.status,
    label: order.status,
    icon: 'fa-circle-info',
    desc: 'Pesanan sedang diproses.'
  };

  const dateCreated = new Date(order.createdAt).toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const dateUpdated = new Date(order.updatedAt || order.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Hitung progress bar width
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const progressPercent = currentStepIndex >= 0 ? (currentStepIndex / (STATUS_STEPS.length - 1)) * 100 : 0;

  container.innerHTML = `
    <!-- Order Status & Timeline Card -->
    <div class="order-status-card">
      <div class="order-meta-banner">
        <div>
          <div class="order-id-label">Nomor Pesanan</div>
          <div class="order-id-val">${order.id}</div>
          <div class="order-date-val"><i class="fa-regular fa-calendar"></i> ${dateCreated}</div>
        </div>
        <div style="text-align: right;">
          <span class="order-status-badge status-${order.status}" style="font-size: 0.875rem; padding: 0.45rem 0.9rem;">
            <i class="fa-solid ${statusMeta.icon}"></i>
            <span>${statusMeta.label}</span>
          </span>
          <div style="font-size: 0.725rem; color: var(--track-text-muted); margin-top: 4px;">Update: ${dateUpdated} WIB</div>
        </div>
      </div>

      <!-- Stepper Timeline -->
      <div class="status-timeline">
        <div class="timeline-progress-bar">
          <div class="timeline-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>

        <div class="timeline-step ${currentStepIndex >= 0 ? (currentStepIndex === 0 ? 'active' : 'completed') : ''}">
          <div class="timeline-icon-node">
            <i class="fa-solid fa-inbox"></i>
          </div>
          <span class="timeline-step-label">Diterima</span>
        </div>

        <div class="timeline-step ${currentStepIndex >= 1 ? (currentStepIndex === 1 ? 'active' : 'completed') : ''}">
          <div class="timeline-icon-node">
            <i class="fa-solid fa-boxes-packing"></i>
          </div>
          <span class="timeline-step-label">Disiapkan</span>
        </div>

        <div class="timeline-step ${currentStepIndex >= 2 ? (currentStepIndex === 2 ? 'active' : 'completed') : ''}">
          <div class="timeline-icon-node">
            <i class="fa-solid fa-truck-fast"></i>
          </div>
          <span class="timeline-step-label">Diantar</span>
        </div>

        <div class="timeline-step ${currentStepIndex >= 3 ? 'completed' : ''}">
          <div class="timeline-icon-node">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <span class="timeline-step-label">Selesai</span>
        </div>
      </div>

      <!-- Status Explanation Banner -->
      <div class="status-desc-banner ${order.status}">
        <i class="fa-solid ${statusMeta.icon}"></i>
        <div>
          <div style="font-weight: 800; font-size: 0.95rem;">${statusMeta.label}</div>
          <div style="font-size: 0.825rem; line-height: 1.35;">${statusMeta.desc}</div>
        </div>
      </div>
    </div>

    <!-- Order Items & Shipping Card -->
    <div class="order-items-card">
      <div class="card-title-head">
        <i class="fa-solid fa-bag-shopping" style="color: var(--track-primary);"></i>
        <span>Rincian Belanja (${order.totalCount} Barang)</span>
      </div>

      <div style="margin-bottom: 1.25rem;">
        ${order.items.map((item, idx) => `
          <div class="track-item-row">
            <div>
              <div class="track-item-title">${idx + 1}. ${item.name}</div>
              <div class="track-item-sub">${item.quantity} ${item.unit} x ${Store.formatCurrency(item.price)}</div>
              ${item.notes ? `<div class="track-item-note"><i class="fa-regular fa-comment-dots"></i> Catatan: ${item.notes}</div>` : ''}
            </div>
            <div style="font-weight: 800; font-size: 0.95rem;">
              ${Store.formatCurrency(item.price * item.quantity)}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="track-total-box">
        <span class="track-total-label">Total Pembayaran:</span>
        <span class="track-total-val">${Store.formatCurrency(order.totalPrice)}</span>
      </div>
    </div>

    <!-- Customer Information Card -->
    <div class="order-items-card">
      <div class="card-title-head">
        <i class="fa-solid fa-location-dot" style="color: var(--track-primary);"></i>
        <span>Informasi Pengiriman</span>
      </div>

      <div class="customer-info-box">
        <div>• <strong>Nama Pemesan:</strong> ${order.customer.name || '-'}</div>
        <div>• <strong>No. WhatsApp:</strong> ${order.customer.phone || '-'}</div>
        <div>• <strong>Alamat Kirim:</strong> ${order.customer.address || '-'}</div>
        ${order.customer.notes ? `<div>• <strong>Catatan Khusus:</strong> <em>${order.customer.notes}</em></div>` : ''}
      </div>

      <div style="margin-top: 1.25rem; text-align: center;">
        <a href="https://wa.me/${Store.ADMIN_WA}?text=${encodeURIComponent(`Halo Rama Swalayan, saya ingin menanyakan status pesanan saya dengan No. Pesanan ${order.id}`)}" target="_blank" class="btn-checkout" style="display: inline-flex; text-decoration: none; justify-content: center; width: 100%;">
          <i class="fa-brands fa-whatsapp" style="font-size: 1.2rem;"></i>
          <span>Hubungi CS Rama Swalayan</span>
        </a>
      </div>
    </div>
  `;
}

function renderNotFoundState(orderId) {
  const container = document.getElementById('tracking-main-content');
  if (!container) return;

  container.innerHTML = `
    <div class="order-status-card">
      <div class="order-not-found">
        <i class="fa-solid fa-file-circle-question"></i>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--track-text-main);">Pesanan Tidak Ditemukan</h3>
        <p style="font-size: 0.85rem; max-width: 420px;">
          Nomor pesanan <strong>"${orderId}"</strong> tidak terdaftar di sistem. Mohon periksa kembali nomor pesanan pada teks yang Anda salin dari aplikasi.
        </p>
        <a href="index.html" class="btn-back-kiosk" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Kembali ke Belanja</span>
        </a>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  const container = document.getElementById('tracking-main-content');
  if (!container) return;

  container.innerHTML = `
    <div class="order-status-card">
      <div class="order-not-found">
        <i class="fa-solid fa-magnifying-glass-location"></i>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--track-text-main);">Pantau Status Pesanan Anda</h3>
        <p style="font-size: 0.85rem; max-width: 420px;">
          Masukkan nomor pesanan Anda (contoh: <strong>RAMA-88219</strong>) pada kolom pencarian di atas untuk memantau proses pesanan secara langsung.
        </p>
      </div>
    </div>
  `;
}
