/**
 * store.js - Rama Swalayan Data Layer (Bahasa Indonesia)
 * Mengelola produk, kategori, keranjang belanja, manajemen gambar (Image Database),
 * manajemen pesanan (Order Management & Tracking System), serta penyimpanan lokal (localStorage).
 * Dilengkapi dengan penanda komentar TODO untuk integrasi API/Database backend masa depan.
 */

const ADMIN_WA = '6285327961606';

const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'Semua Produk', icon: 'fa-layer-group' },
  { id: 'minuman', name: 'Minuman Segar', icon: 'fa-mug-hot' },
  { id: 'camilan', name: 'Camilan & Roti', icon: 'fa-cookie-bite' },
  { id: 'segar', name: 'Buah & Sayur Segar', icon: 'fa-apple-whole' },
  { id: 'olahan-susu', name: 'Susu & Telur', icon: 'fa-egg' },
  { id: 'perawatan', name: 'Perawatan Diri', icon: 'fa-pump-soap' },
  { id: 'kebutuhan-rumah', name: 'Kebutuhan Rumah', icon: 'fa-spray-can-sparkles' }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Air Mineral Pegunungan 600ml',
    category: 'minuman',
    price: 5000,
    unit: 'botol',
    stock: 120,
    image: '',
    description: 'Air mineral alami segar dan higienis dari mata air pegunungan terpilih.'
  },
  {
    id: 'prod-2',
    name: 'Es Teh Susu Manis 500ml',
    category: 'minuman',
    price: 18000,
    unit: 'cup',
    stock: 45,
    image: '',
    description: 'Seduhan teh hitam premium berpadu dengan susu kental manis lembut dan es segar.'
  },
  {
    id: 'prod-3',
    name: 'Kopi Cold Brew Arabika 250ml',
    category: 'minuman',
    price: 24000,
    unit: 'botol',
    stock: 30,
    image: '',
    description: 'Kopi cold brew seduh dingin 16 jam dengan biji kopi Arabika murni rendah asam.'
  },
  {
    id: 'prod-4',
    name: 'Keripik Kentang Panggang BBQ 150g',
    category: 'camilan',
    price: 16500,
    unit: 'bungkus',
    stock: 60,
    image: '',
    description: 'Keripik kentang renyah bergelombang dengan bumbu tabur barbeque gurih lezat.'
  },
  {
    id: 'prod-5',
    name: 'Roti Croissant Mentega Gurih',
    category: 'camilan',
    price: 15000,
    unit: 'item',
    stock: 25,
    image: '',
    description: 'Pastry khas Prancis berlapis renyah dengan aroma mentega murni panggang hangat.'
  },
  {
    id: 'prod-6',
    name: 'Kukis Cokelat Lembut Lumer',
    category: 'camilan',
    price: 12000,
    unit: 'keping',
    stock: 40,
    image: '',
    description: 'Kukis lembut lumer (soft-baked) dengan limpahan choco chips cokelat Belgia.'
  },
  {
    id: 'prod-7',
    name: 'Apel Fuji Segar (Isi 3 Buah)',
    category: 'segar',
    price: 28000,
    unit: 'paket',
    stock: 18,
    image: '',
    description: 'Apel Fuji manis renyah kaya vitamin dan serat, disajikan segar pilihan terbaik.'
  },
  {
    id: 'prod-8',
    name: 'Pisang Cavendish Manis 1kg',
    category: 'segar',
    price: 22000,
    unit: 'kg',
    stock: 20,
    image: '',
    description: 'Pisang Cavendish kuning matang alami berkulit mulus dan bertekstur legit.'
  },
  {
    id: 'prod-9',
    name: 'Susu Sapi Murni Pasteurisasi 1L',
    category: 'olahan-susu',
    price: 26000,
    unit: 'karton',
    stock: 35,
    image: '',
    description: '100% susu segar murni pasteurisasi kaya kalsium untuk daya tahan tubuh keluarga.'
  },
  {
    id: 'prod-10',
    name: 'Telur Ayam Organik Omega-3 (Isi 10)',
    category: 'olahan-susu',
    price: 32000,
    unit: 'kotak',
    stock: 22,
    image: '',
    description: 'Telur segar peternakan bebas antibiotik dengan kandungan nutrisi Omega-3 tinggi.'
  },
  {
    id: 'prod-11',
    name: 'Sabun Mandi Cair Lidah Buaya 500ml',
    category: 'perawatan',
    price: 45000,
    unit: 'botol',
    stock: 15,
    image: '',
    description: 'Sabun cair pelembap kulit dengan ekstrak lidah buaya alami dan Vitamin E lembut.'
  },
  {
    id: 'prod-12',
    name: 'Pembersih Tangan Antiseptik Gel 100ml',
    category: 'perawatan',
    price: 12500,
    unit: 'botol',
    stock: 50,
    image: '',
    description: 'Gel pembersih tangan alkohol 70% efektif membunuh 99.9% kuman tanpa lengket.'
  },
  {
    id: 'prod-13',
    name: 'Semprotan Pembersih Serbaguna Citrus 500ml',
    category: 'kebutuhan-rumah',
    price: 27500,
    unit: 'botol',
    stock: 19,
    image: '',
    description: 'Cairan pembersih lantai dan meja anti-lemak beraroma jeruk nipis menyegarkan.'
  },
  {
    id: 'prod-14',
    name: 'Tisu Wajah Lembut 3 Lapis 200 Lembar',
    category: 'kebutuhan-rumah',
    price: 14000,
    unit: 'kotak',
    stock: 40,
    image: '',
    description: 'Tisu wajah lembut 3-ply dari serat alami murni yang higienis dan tidak mudah robek.'
  }
];

// Status pesanan yang didukung
const ORDER_STATUSES = {
  RECEIVED: { id: 'received', label: 'Diterima', icon: 'fa-inbox', desc: 'Pesanan telah diterima oleh Rama Swalayan dan sedang menunggu antrean.' },
  PREPARING: { id: 'preparing', label: 'Disiapkan', icon: 'fa-boxes-packing', desc: 'Barang pesanan Anda sedang disiapkan dan dikemas dengan teliti.' },
  DELIVERING: { id: 'delivering', label: 'Diantar', icon: 'fa-truck-fast', desc: 'Pesanan sedang dalam perjalanan pengiriman menuju alamat Anda.' },
  COMPLETED: { id: 'completed', label: 'Selesai', icon: 'fa-circle-check', desc: 'Pesanan telah selesai diantar dan diterima oleh pembeli.' }
};

const DEFAULT_ORDERS = [
  {
    id: 'RAMA-88219',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    status: 'preparing',
    customer: {
      name: 'Rian Pratama',
      phone: '081234567890',
      address: 'Jl. Merpati No. 45, Kebayoran',
      notes: 'Tolong roti croissant dipisah bungkusnya ya'
    },
    items: [
      { id: 'prod-5', name: 'Roti Croissant Mentega Gurih', price: 15000, unit: 'item', quantity: 2, notes: '' },
      { id: 'prod-3', name: 'Kopi Cold Brew Arabika 250ml', price: 24000, unit: 'botol', quantity: 1, notes: 'Dingin' }
    ],
    totalCount: 3,
    totalPrice: 54000
  },
  {
    id: 'RAMA-77341',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    status: 'delivering',
    customer: {
      name: 'Siti Aminah',
      phone: '085678901234',
      address: 'Jl. Melati Indah Blok B2/10',
      notes: 'Titip di satpam jika tidak ada orang'
    },
    items: [
      { id: 'prod-9', name: 'Susu Sapi Murni Pasteurisasi 1L', price: 26000, unit: 'karton', quantity: 2, notes: '' },
      { id: 'prod-7', name: 'Apel Fuji Segar (Isi 3 Buah)', price: 28000, unit: 'paket', quantity: 1, notes: '' }
    ],
    totalCount: 3,
    totalPrice: 80000
  },
  {
    id: 'RAMA-66102',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: 'completed',
    customer: {
      name: 'Hendro Gunawan',
      phone: '087811223344',
      address: 'Apartemen Menteng Square Tower A Lt. 12',
      notes: ''
    },
    items: [
      { id: 'prod-14', name: 'Tisu Wajah Lembut 3 Lapis 200 Lembar', price: 14000, unit: 'kotak', quantity: 3, notes: '' }
    ],
    totalCount: 3,
    totalPrice: 42000
  }
];

const STORAGE_KEYS = {
  PRODUCTS: 'rama_inventory_products_v3',
  CATEGORIES: 'rama_inventory_categories_v3',
  CART: 'rama_customer_cart_v3',
  IMAGE_DB: 'rama_image_database_v1',
  ORDERS: 'rama_customer_orders_v1',
  AUTH: 'rama_admin_token_v1'
};

const AUTHORIZATION = null;

const Store = {
  AUTHORIZATION: null,
  onUnauthorized: null,

  loadToken() {
    this.AUTHORIZATION = localStorage.getItem(STORAGE_KEYS.AUTH);
  },

  saveToken(token) {
    this.AUTHORIZATION = token;
    localStorage.setItem(STORAGE_KEYS.AUTH, token);
  },

  ORDER_STATUSES,
  ADMIN_WA,

  // Helper format mata uang Rupiah
  formatCurrency(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  },

  /**
   * =========================================================================
   * IMAGE DATABASE & STORAGE SERVICES (DUMMY CODE WITH TODO MARKERS)
   * =========================================================================
   */

  /**
   * Upload and process image file
   * TODO: Replace with Backend API: POST /api/upload/image (e.g. AWS S3, Cloudinary, or MinIO multipart upload)
   *
   * @param {File} file - File foto dari input file
   * @returns {Promise<{id: string, url: string, filename: string, size: number}>}
   */
  async uploadImage(file) {
    if (!file) return null;

    if (!file.type.startsWith('image/')) {
      throw new Error('File yang diunggah harus berupa gambar (JPG, PNG, WebP).');
    }

    if (file.size > 3 * 1024 * 1024) {
      throw new Error('Ukuran gambar maksimal 3MB.');
    }

    const response = await fetch('api/auth/images', {
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}` },
      method: 'POST',
      body: file,
    });

    if (response.status === 401 && this.onUnauthorized) {
      await this.onUnauthorized();
      return this.uploadImage(file);
    }

    if (!response.ok) {
      throw new Error(`Gagal mengunggah gambar: HTTP ${response.status}`);
    }

    return await response.json();
  },

  // async saveImageToDb(imageRecord) {
  //   try {
  //     const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_DB);
  //     const db = raw ? JSON.parse(raw) : [];
  //     db.unshift(imageRecord);
  //     if (db.length > 50) db.pop();
  //     localStorage.setItem(STORAGE_KEYS.IMAGE_DB, JSON.stringify(db));
  //     return imageRecord;
  //   } catch (e) {
  //     console.warn('Image Database localStorage limit reached:', e);
  //     return imageRecord;
  //   }
  // },

  // async getAllImagesFromDb() {
  //   const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_DB);
  //   return raw ? JSON.parse(raw) : [];
  // },

  // async deleteImageFromDb(imageId) {
  //   const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_DB);
  //   if (!raw) return true;
  //   let db = JSON.parse(raw);
  //   db = db.filter(img => img.id !== imageId);
  //   localStorage.setItem(STORAGE_KEYS.IMAGE_DB, JSON.stringify(db));
  //   return true;
  // },

  /**
   * =========================================================================
   * PRODUCT & CATEGORY SERVICES
   * =========================================================================
   */

  async getCategories(local = true) {
    if (local) {
      const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return raw ? JSON.parse(raw) : [];
    }

    const response = await fetch("api/categories");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const categories = await response.json();

    localStorage.setItem(
      STORAGE_KEYS.CATEGORIES,
      JSON.stringify(categories)
    );

    return categories;
  },

  async getProducts(local = false) {
    if (local) {
      const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return raw ? JSON.parse(raw) : [];
    }

    const response = await fetch('api/products');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const products = await response.json();

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return products;
  },

  async saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return products;
  },

  async patchProduct(p) {
    const products = await this.getProducts(true);
    const newProduct = {
      id: p.id.trim(),
      name: p.name.trim(),
      barcode: p.barcode.trim(),
      category: p.category,
      price: parseInt(p.price) || 0,
      discount: parseInt(p.discount) || 0,
      salePrice: parseInt(p.salePrice) || 0,
      unit: p.unit ? p.unit.trim() : 'item',
      image: p.image || '',
      description: p.description ? p.description.trim() : ''
    };

    const response = await fetch('api/auth/products', {
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}`, 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(newProduct),
    });

    if (response.status === 401 && this.onUnauthorized) {
      await this.onUnauthorized();
      return this.patchProduct(p);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const index = products.findIndex(product => product.id === newProduct.id);

    if (index !== -1) {
      products[index] = newProduct;
    } else {
      products.unshift(newProduct);
    }
    await this.saveProducts(products);
    return newProduct;
  },

  async deleteProduct(id) {
    let products = await this.getProducts(true);

    const response = await fetch('api/auth/products', {
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}`, 'Content-Type': 'application/json' },
      method: 'DELETE',
      body: JSON.stringify({ id: id }),
    });

    if (response.status === 401 && this.onUnauthorized) {
      await this.onUnauthorized();
      return this.deleteProduct(id);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    products = products.filter(p => p.id !== id);
    await this.saveProducts(products);
    return true;
  },

  getProductImage(p) {

    return p.image;
  },

  getProductById(id) {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const products = raw ? JSON.parse(raw) : [];
    return products.find(product => product.id === id) ?? null;
  },

  async resetToDefault() {
  },

  async downloadCSV(password) {
    const response = await fetch('api/auth/tables', {
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}`, 'X-Pass': password },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();

    const filename = decodeURIComponent(
      new URL(response.url).pathname.split('/').pop()
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  },

  async uploadCSV(file, password) {
    const response = await fetch('api/auth/tables', {
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}`, 'X-Pass': password, 'Content-Type': 'text/csv', },
      method: 'POST',
      body: file,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  },

  /**
   * =========================================================================
   * ORDER MANAGEMENT & TRACKING SERVICES (DUMMY CODE WITH TODO MARKERS)
   * =========================================================================
   */

  /**
   * Mengambil semua daftar pesanan
   * TODO: Ganti dengan Backend API: GET /api/orders
   */
  async getOrders(local = false) {
    if (local) {
      const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return raw ? JSON.parse(raw) : [];
    }

    const response = await fetch('api/auth/orders', {
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}` },
    });

    if (response.status === 401 && this.onUnauthorized) {
      await this.onUnauthorized();
      return this.getOrders(local);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const orders = await response.json();

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    return orders;
  },

  /**
   * Menyimpan keseluruhan daftar pesanan
   * TODO: Ganti dengan Backend Database Batch Query
   */
  async saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('orders-updated', { detail: { orders } }));
    return orders;
  },

  /**
   * Mengambil detail satu pesanan berdasarkan ID
   * TODO: Ganti dengan Backend API: GET /api/orders/:id
   */
  async getOrderById(orderId) {
    if (!orderId) return null;

    const response = await fetch(`api/order?id=${orderId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Membuat pesanan baru saat checkout (sebelum/saat menyalin text WhatsApp)
   * TODO: Ganti dengan Backend API: POST /api/orders
   *
   * @param {Object} customerInfo - Data nama, nomor WA, alamat, catatan
   * @param {Array} cart - Daftar item keranjang
   * @param {string} customOrderId - ID unik pesanan (RAMA-XXXXX)
   */
  async createOrder(customerInfo = {}, cart = null) {
    const currentCart = cart || this.getCart();
    if (!currentCart || currentCart.length === 0) return null;

    const { totalCount, totalPrice } = this.getCartTotal(currentCart);

    const newOrder = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'received', // received | preparing | delivering | completed
      customer: {
        id: customerInfo.member ? customerInfo.member.trim() : '',
        name: customerInfo.name ? customerInfo.name.trim() : 'Pelanggan Rama',
        phone: customerInfo.phone ? customerInfo.phone.trim() : '',
        address: customerInfo.address ? customerInfo.address.trim() : '',
        notes: customerInfo.notes ? customerInfo.notes.trim() : ''
      },
      items: currentCart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        unit: item.unit || 'item',
        quantity: item.quantity,
        notes: item.notes || ''
      })),
      totalCount,
      totalPrice
    };

    const response = await fetch('api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Memperbarui status pesanan (received, preparing, delivering, completed)
   * TODO: Ganti dengan Backend API: PATCH /api/orders/status?id={id}
   */
  async updateOrderStatus(orderId, newStatus) {
    const order = await this.getOrderById(orderId);
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    const response = await fetch('api/auth/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.AUTHORIZATION || ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    if (response.status === 401 && this.onUnauthorized) {
      await this.onUnauthorized();
      return this.updateOrderStatus(orderId, newStatus);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const orders = await this.getOrders(true);
    const index = orders.findIndex(o => o.id.toUpperCase() === orderId.toUpperCase());
    if (index !== -1) {
      orders[index] = order;
      await this.saveOrders(orders);
      return orders[index];
    }
    throw new Error('Pesanan tidak ditemukan');
  },

  /**
   * Menghapus pesanan
   * TODO: Ganti dengan Backend API: DELETE /api/orders/:id
   */
  async deleteOrder(orderId) {
    let orders = await this.getOrders(true);
    orders = orders.filter(o => o.id.toUpperCase() !== orderId.toUpperCase());
    await this.saveOrders(orders);
    return true;
  },

  /**
   * =========================================================================
   * CART & CHECKOUT SERVICES
   * =========================================================================
   */

  getCart() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart(cart) {
    sessionStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
  },

  updateCart(allProducts) {
    const cart = this.getCart();

    const productsById = new Map(
      allProducts.map(p => [p.id, p])
    );

    const updatedCart = cart
      .filter(cartItem => productsById.has(cartItem.id))
      .map(cartItem => {
        const product = productsById.get(cartItem.id);

        const price = Number(product.price) || 0;
        const discount = Number(product.discount) || 0;
        const salePrice = Number(product.salePrice) || (
          discount > 0
            ? price * (1 - discount / 100)
            : price
        );

        return {
          ...cartItem,
          price: salePrice
        };
      });

    this.saveCart(updatedCart);
  },

  addToCart(product, quantity = 1, notes = '') {
    const cart = this.getCart();
    const cleanNotes = notes ? notes.trim() : '';
    const existingIndex = cart.findIndex(item => item.id === product.id && (item.notes || '') === cleanNotes);

    const price = Number(product.price) || 0;
    const discount = Number(product.discount) || 0;
    const salePrice = Number(product.salePrice) || (
      discount > 0
        ? price * (1 - discount / 100)
        : price
    );

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: salePrice,
        unit: product.unit || 'item',
        image: product.image || '',
        quantity: quantity,
        notes: cleanNotes
      });
    }
    this.saveCart(cart);
    return cart;
  },

  updateCartItemQuantity(index, quantity) {
    const cart = this.getCart();
    if (cart[index]) {
      if (quantity <= 0) {
        cart.splice(index, 1);
      } else {
        cart[index].quantity = quantity;
      }
      this.saveCart(cart);
    }
    return cart;
  },

  removeCartItem(index) {
    const cart = this.getCart();
    if (cart[index]) {
      cart.splice(index, 1);
      this.saveCart(cart);
    }
    return cart;
  },

  clearCart() {
    sessionStorage.removeItem(STORAGE_KEYS.CART);
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: [] } }));
    return [];
  },

  getCartTotal(cart = null) {
    const currentCart = cart || this.getCart();
    const totalCount = currentCart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = currentCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return { totalCount, totalPrice };
  },

  /**
   * Membuat tautan pemantauan status pesanan (e.g. /order.html?id=RAMA-XXXXX atau full URL)
   */
  getOrderTrackingUrl(orderId) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${origin}${basePath}order.html?id=${orderId}`;
  },

  /**
   * Membuat template teks pesanan terformat untuk disalin ke WhatsApp (dengan tautan pantau pesanan)
   */
  formatOrderText(customerInfo = {}, cart = null) {
    const currentCart = cart || this.getCart();
    const dateStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const { totalCount, totalPrice } = this.getCartTotal(currentCart);
    // const activeOrderId = orderId || 'RAMA-XXXXX';
    // const trackingUrl = this.getOrderTrackingUrl(activeOrderId);

    let text = `🛒 *PESANAN BARU - RAMA STORE*\n`;
    text += `📅 *Waktu Pemesanan:* ${dateStr}\n`;
    text += `------------------------------------\n`;

    const hasCustomerInfo = customerInfo.name || customerInfo.address || customerInfo.phone || customerInfo.notes;
    if (hasCustomerInfo) {
      text += `👤 *DATA PEMESAN:*\n`;
      if (customerInfo.name) text += `• Nama: *${customerInfo.name.trim()}*\n`;
      if (customerInfo.phone) text += `• No. WhatsApp: ${customerInfo.phone.trim()}\n`;
      if (customerInfo.member) text += `• No. Member: ${customerInfo.member.trim()}\n`;
      if (customerInfo.address) text += `• Alamat Kirim: ${customerInfo.address.trim()}\n`;
      if (customerInfo.notes) text += `• Catatan Pengiriman: _${customerInfo.notes.trim()}_\n`;
      text += `------------------------------------\n`;
    }

    text += `🛍️ *DAFTAR ITEM PESANAN (${totalCount} item):*\n`;
    currentCart.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      text += `${index + 1}. *${item.name}*\n`;
      text += `   ↳ Jumlah: ${item.quantity} ${item.unit || 'item'} x ${this.formatCurrency(item.price)} = *${this.formatCurrency(subtotal)}*\n`;
      if (item.notes) {
        text += `   ↳ _Catatan Khusus: ${item.notes}_\n`;
      }
    });

    text += `------------------------------------\n`;
    text += `💰 *TOTAL ESTIMASI: ${this.formatCurrency(totalPrice)}*\n`;
    text += `------------------------------------\n`;
    text += `Halo Rama Swalayan, saya ingin memesan barang di atas. Mohon konfirmasi ketersediaan dan info pembayaran/ongkirnya ya. Terima kasih! 🙏`;

    return text;
  },

  /**
   * Membuat tautan wa.me dengan teks terenkode ke nomor admin
   */
  getWhatsAppSendUrl(adminPhone, text) {
    const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
};
