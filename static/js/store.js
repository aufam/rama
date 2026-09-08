/**
 * store.js - Rama Store Data Layer (Bahasa Indonesia)
 * Mengelola produk, kategori, keranjang belanja, manajemen gambar (Image Database),
 * manajemen pesanan (Order Management & Tracking System), serta penyimpanan lokal (localStorage).
 * Dilengkapi dengan penanda komentar TODO untuk integrasi API/Database backend masa depan.
 */

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
    image: null,
    description: 'Air mineral alami segar dan higienis dari mata air pegunungan terpilih.'
  },
  {
    id: 'prod-2',
    name: 'Es Teh Susu Manis 500ml',
    category: 'minuman',
    price: 18000,
    unit: 'cup',
    stock: 45,
    image: null,
    description: 'Seduhan teh hitam premium berpadu dengan susu kental manis lembut dan es segar.'
  },
  {
    id: 'prod-3',
    name: 'Kopi Cold Brew Arabika 250ml',
    category: 'minuman',
    price: 24000,
    unit: 'botol',
    stock: 30,
    image: null,
    description: 'Kopi cold brew seduh dingin 16 jam dengan biji kopi Arabika murni rendah asam.'
  },
  {
    id: 'prod-4',
    name: 'Keripik Kentang Panggang BBQ 150g',
    category: 'camilan',
    price: 16500,
    unit: 'bungkus',
    stock: 60,
    image: null,
    description: 'Keripik kentang renyah bergelombang dengan bumbu tabur barbeque gurih lezat.'
  },
  {
    id: 'prod-5',
    name: 'Roti Croissant Mentega Gurih',
    category: 'camilan',
    price: 15000,
    unit: 'buah',
    stock: 25,
    image: null,
    description: 'Pastry khas Prancis berlapis renyah dengan aroma mentega murni panggang hangat.'
  },
  {
    id: 'prod-6',
    name: 'Kukis Cokelat Lembut Lumer',
    category: 'camilan',
    price: 12000,
    unit: 'keping',
    stock: 40,
    image: null,
    description: 'Kukis lembut lumer (soft-baked) dengan limpahan choco chips cokelat Belgia.'
  },
  {
    id: 'prod-7',
    name: 'Apel Fuji Segar (Isi 3 Buah)',
    category: 'segar',
    price: 28000,
    unit: 'paket',
    stock: 18,
    image: null,
    description: 'Apel Fuji manis renyah kaya vitamin dan serat, disajikan segar pilihan terbaik.'
  },
  {
    id: 'prod-8',
    name: 'Pisang Cavendish Manis 1kg',
    category: 'segar',
    price: 22000,
    unit: 'kg',
    stock: 20,
    image: null,
    description: 'Pisang Cavendish kuning matang alami berkulit mulus dan bertekstur legit.'
  },
  {
    id: 'prod-9',
    name: 'Susu Sapi Murni Pasteurisasi 1L',
    category: 'olahan-susu',
    price: 26000,
    unit: 'karton',
    stock: 35,
    image: null,
    description: '100% susu segar murni pasteurisasi kaya kalsium untuk daya tahan tubuh keluarga.'
  },
  {
    id: 'prod-10',
    name: 'Telur Ayam Organik Omega-3 (Isi 10)',
    category: 'olahan-susu',
    price: 32000,
    unit: 'kotak',
    stock: 22,
    image: null,
    description: 'Telur segar peternakan bebas antibiotik dengan kandungan nutrisi Omega-3 tinggi.'
  },
  {
    id: 'prod-11',
    name: 'Sabun Mandi Cair Lidah Buaya 500ml',
    category: 'perawatan',
    price: 45000,
    unit: 'botol',
    stock: 15,
    image: null,
    description: 'Sabun cair pelembap kulit dengan ekstrak lidah buaya alami dan Vitamin E lembut.'
  },
  {
    id: 'prod-12',
    name: 'Pembersih Tangan Antiseptik Gel 100ml',
    category: 'perawatan',
    price: 12500,
    unit: 'botol',
    stock: 50,
    image: null,
    description: 'Gel pembersih tangan alkohol 70% efektif membunuh 99.9% kuman tanpa lengket.'
  },
  {
    id: 'prod-13',
    name: 'Semprotan Pembersih Serbaguna Citrus 500ml',
    category: 'kebutuhan-rumah',
    price: 27500,
    unit: 'botol',
    stock: 19,
    image: null,
    description: 'Cairan pembersih lantai dan meja anti-lemak beraroma jeruk nipis menyegarkan.'
  },
  {
    id: 'prod-14',
    name: 'Tisu Wajah Lembut 3 Lapis 200 Lembar',
    category: 'kebutuhan-rumah',
    price: 14000,
    unit: 'kotak',
    stock: 40,
    image: null,
    description: 'Tisu wajah lembut 3-ply dari serat alami murni yang higienis dan tidak mudah robek.'
  }
];

// Status pesanan yang didukung
const ORDER_STATUSES = {
  RECEIVED: { id: 'received', label: 'Diterima', icon: 'fa-inbox', desc: 'Pesanan telah diterima oleh Rama Store dan sedang menunggu antrean.' },
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
      { id: 'prod-5', name: 'Roti Croissant Mentega Gurih', price: 15000, unit: 'buah', quantity: 2, notes: '' },
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
  ORDERS: 'rama_customer_orders_v1'
};

const Store = {
  ORDER_STATUSES,

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

    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return reject(new Error('File yang diunggah harus berupa gambar (JPG, PNG, WebP).'));
      }

      if (file.size > 3 * 1024 * 1024) {
        return reject(new Error('Ukuran gambar maksimal 3MB.'));
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        const imageId = 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

        const imageRecord = {
          id: imageId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          url: base64Data, // In production, this will be a CDN URL
          createdAt: new Date().toISOString()
        };

        await this.saveImageToDb(imageRecord);
        // TODO: Simpan metadata gambar ke Database Backend: POST /api/media/images
        resolve(imageRecord);
      };

      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  async saveImageToDb(imageRecord) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_DB);
      const db = raw ? JSON.parse(raw) : [];
      db.unshift(imageRecord);
      if (db.length > 50) db.pop();
      localStorage.setItem(STORAGE_KEYS.IMAGE_DB, JSON.stringify(db));
      return imageRecord;
    } catch (e) {
      console.warn('Image Database localStorage limit reached:', e);
      return imageRecord;
    }
  },

  async getAllImagesFromDb() {
    const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_DB);
    return raw ? JSON.parse(raw) : [];
  },

  async deleteImageFromDb(imageId) {
    const raw = localStorage.getItem(STORAGE_KEYS.IMAGE_DB);
    if (!raw) return true;
    let db = JSON.parse(raw);
    db = db.filter(img => img.id !== imageId);
    localStorage.setItem(STORAGE_KEYS.IMAGE_DB, JSON.stringify(db));
    return true;
  },

  /**
   * =========================================================================
   * PRODUCT & CATEGORY SERVICES
   * =========================================================================
   */

  async getCategories() {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Gagal memuat kategori dari penyimpanan:', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  },

  async getProducts() {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Gagal memuat produk dari penyimpanan:', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  },

  async saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return products;
  },

  async addProduct(productData) {
    const products = await this.getProducts();
    const newProduct = {
      id: 'prod-' + Date.now(),
      name: productData.name.trim(),
      category: productData.category,
      price: parseFloat(productData.price) || 0,
      unit: productData.unit ? productData.unit.trim() : 'buah',
      stock: parseInt(productData.stock, 10) || 0,
      image: productData.image || null,
      description: productData.description ? productData.description.trim() : ''
    };
    products.unshift(newProduct);
    await this.saveProducts(products);
    return newProduct;
  },

  async updateProduct(id, productData) {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        name: productData.name.trim(),
        category: productData.category,
        price: parseFloat(productData.price) || 0,
        unit: productData.unit ? productData.unit.trim() : 'buah',
        stock: parseInt(productData.stock, 10) || 0,
        image: productData.image !== undefined ? productData.image : products[index].image,
        description: productData.description ? productData.description.trim() : ''
      };
      await this.saveProducts(products);
      return products[index];
    }
    throw new Error('Produk tidak ditemukan');
  },

  async deleteProduct(id) {
    let products = await this.getProducts();
    products = products.filter(p => p.id !== id);
    await this.saveProducts(products);
    return true;
  },

  async resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
    return { products: DEFAULT_PRODUCTS, categories: DEFAULT_CATEGORIES, orders: DEFAULT_ORDERS };
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
  async getOrders() {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Gagal memuat pesanan dari penyimpanan:', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
    return DEFAULT_ORDERS;
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
    const orders = await this.getOrders();
    const cleanId = orderId.toString().trim().toUpperCase();
    return orders.find(o => o.id.toUpperCase() === cleanId) || null;
  },

  /**
   * Membuat pesanan baru saat checkout (sebelum/saat menyalin text WhatsApp)
   * TODO: Ganti dengan Backend API: POST /api/orders
   *
   * @param {Object} customerInfo - Data nama, nomor WA, alamat, catatan
   * @param {Array} cart - Daftar item keranjang
   * @param {string} customOrderId - ID unik pesanan (RAMA-XXXXX)
   */
  async createOrder(customerInfo = {}, cart = null, customOrderId = null) {
    const currentCart = cart || this.getCart();
    if (!currentCart || currentCart.length === 0) return null;

    const { totalCount, totalPrice } = this.getCartTotal(currentCart);
    const orderId = customOrderId || 'RAMA-' + Math.floor(10000 + Math.random() * 90000);

    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'received', // received | preparing | delivering | completed
      customer: {
        name: customerInfo.name ? customerInfo.name.trim() : 'Pelanggan Rama',
        phone: customerInfo.phone ? customerInfo.phone.trim() : '',
        address: customerInfo.address ? customerInfo.address.trim() : '',
        notes: customerInfo.notes ? customerInfo.notes.trim() : ''
      },
      items: currentCart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        unit: item.unit || 'buah',
        quantity: item.quantity,
        notes: item.notes || ''
      })),
      totalCount,
      totalPrice
    };

    const orders = await this.getOrders();
    // Jika pesanan dengan ID yang sama sudah ada (misal re-copy), perbarui
    const existingIndex = orders.findIndex(o => o.id === orderId);
    if (existingIndex > -1) {
      orders[existingIndex] = newOrder;
    } else {
      orders.unshift(newOrder);
    }

    await this.saveOrders(orders);
    return newOrder;
  },

  /**
   * Memperbarui status pesanan (received, preparing, delivering, completed)
   * TODO: Ganti dengan Backend API: PATCH /api/orders/:id/status
   */
  async updateOrderStatus(orderId, newStatus) {
    const orders = await this.getOrders();
    const index = orders.findIndex(o => o.id.toUpperCase() === orderId.toUpperCase());
    if (index !== -1) {
      orders[index].status = newStatus;
      orders[index].updatedAt = new Date().toISOString();
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
    let orders = await this.getOrders();
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

  addToCart(product, quantity = 1, notes = '') {
    const cart = this.getCart();
    const cleanNotes = notes ? notes.trim() : '';
    const existingIndex = cart.findIndex(item => item.id === product.id && (item.notes || '') === cleanNotes);
    
    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit || 'buah',
        image: product.image || null,
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
  formatOrderText(customerInfo = {}, cart = null, orderId = null) {
    const currentCart = cart || this.getCart();
    const dateStr = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    const { totalCount, totalPrice } = this.getCartTotal(currentCart);
    const activeOrderId = orderId || 'RAMA-XXXXX';
    const trackingUrl = this.getOrderTrackingUrl(activeOrderId);

    let text = `🛒 *PESANAN BARU - RAMA STORE*\n`;
    text += `🆔 *No. Pesanan:* ${activeOrderId}\n`;
    text += `📅 *Waktu Pemesanan:* ${dateStr}\n`;
    text += `------------------------------------\n`;
    
    const hasCustomerInfo = customerInfo.name || customerInfo.address || customerInfo.phone || customerInfo.notes;
    if (hasCustomerInfo) {
      text += `👤 *DATA PEMESAN:*\n`;
      if (customerInfo.name) text += `• Nama: *${customerInfo.name.trim()}*\n`;
      if (customerInfo.phone) text += `• No. WhatsApp: ${customerInfo.phone.trim()}\n`;
      if (customerInfo.address) text += `• Alamat Kirim: ${customerInfo.address.trim()}\n`;
      if (customerInfo.notes) text += `• Catatan Pengiriman: _${customerInfo.notes.trim()}_\n`;
      text += `------------------------------------\n`;
    }

    text += `🛍️ *DAFTAR ITEM PESANAN (${totalCount} item):*\n`;
    currentCart.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      text += `${index + 1}. *${item.name}*\n`;
      text += `   ↳ Jumlah: ${item.quantity} ${item.unit || 'buah'} x ${this.formatCurrency(item.price)} = *${this.formatCurrency(subtotal)}*\n`;
      if (item.notes) {
        text += `   ↳ _Catatan Khusus: ${item.notes}_\n`;
      }
    });

    text += `------------------------------------\n`;
    text += `💰 *TOTAL ESTIMASI: ${this.formatCurrency(totalPrice)}*\n`;
    text += `------------------------------------\n`;
    text += `📍 *Pantau order anda di:*\n${trackingUrl}\n`;
    text += `------------------------------------\n`;
    text += `Halo Rama Store, saya ingin memesan barang di atas. Mohon konfirmasi ketersediaan dan info pembayaran/ongkirnya ya. Terima kasih! 🙏`;

    return text;
  }
};
