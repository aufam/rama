/* Domain types, constants & pure helpers — shared across the app. */

export interface Category {
  id: string
  name: string
  icon: string
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  image: string
  description: string
  barcode?: string
  discount?: number
  salePrice?: number
}

export interface CartItem {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string
  quantity: number
  notes: string
}

export type OrderStatus = 'received' | 'preparing' | 'delivering' | 'completed'

export interface CustomerInfo {
  id: string
  member?: string
  name: string
  phone: string
  address: string
  notes: string
}

export interface OrderItem {
  id: string
  name: string
  price: number
  unit: string
  quantity: number
  notes: string
}

export interface Order {
  id: string
  createdAt: string
  updatedAt: string
  status: string
  customer: CustomerInfo
  items: OrderItem[]
  totalCount: number
  totalPrice: number
}

export interface BannerSet {
  landscape: string[]
  square1: string[]
  square2: string[]
}

export interface ProductDraft {
  id: string
  name: string
  barcode: string
  category: string
  price: string
  discount: string
  salePrice: string
  unit: string
  image: string
  description: string
}

export const STATUS_ORDER: OrderStatus[] = ['received', 'preparing', 'delivering', 'completed']

export function orderCount(o: Order): number {
  return Number(o.totalCount) || (o.items || []).reduce((a, i) => a + (Number(i.quantity) || 0), 0)
}

export function orderTotal(o: Order): number {
  return Number(o.totalPrice) || (o.items || []).reduce((a, i) => a + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
}

export const STATUS_META: Record<string, { label: string; icon: string; desc: string; tone: string }> = {
  received: { label: 'Diterima', icon: 'fa-inbox', desc: 'Pesanan telah diterima Rama Swalayan dan menunggu antrean.', tone: 'blue' },
  preparing: { label: 'Disiapkan', icon: 'fa-boxes-packing', desc: 'Barang pesanan sedang disiapkan dan dikemas dengan teliti.', tone: 'amber' },
  delivering: { label: 'Diantar', icon: 'fa-truck-fast', desc: 'Pesanan sedang dalam perjalanan menuju alamat Anda.', tone: 'violet' },
  completed: { label: 'Selesai', icon: 'fa-circle-check', desc: 'Pesanan telah selesai diantar dan diterima pembeli.', tone: 'green' },
}

export const ADMIN_WA = '6285327961606'

export const STORAGE_KEYS = {
  PRODUCTS: 'rama_inventory_products_v3',
  CATEGORIES: 'rama_inventory_categories_v3',
  CART: 'rama_customer_cart_v3',
  ORDERS: 'rama_customer_orders_v1',
  AUTH: 'rama_admin_token_v1',
  BANNERS: 'rama_promo_banners_v1',
  MY_ORDER_HISTORY: 'rama_my_order_history_v1',
  CUSTOMER_INFO: 'rama_customer_info_v1',
} as const

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'Semua Produk', icon: 'fa-layer-group' },
  { id: 'minuman', name: 'Minuman Segar', icon: 'fa-mug-hot' },
  { id: 'camilan', name: 'Camilan & Roti', icon: 'fa-cookie-bite' },
  { id: 'segar', name: 'Buah & Sayur Segar', icon: 'fa-apple-whole' },
  { id: 'olahan-susu', name: 'Susu & Telur', icon: 'fa-egg' },
  { id: 'perawatan', name: 'Perawatan Diri', icon: 'fa-pump-soap' },
  { id: 'kebutuhan-rumah', name: 'Kebutuhan Rumah', icon: 'fa-spray-can-sparkles' },
]

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Air Mineral Pegunungan 600ml', category: 'minuman', price: 5000, unit: 'botol', stock: 120, image: '', description: 'Air mineral alami segar dan higienis dari mata air pegunungan terpilih.' },
  { id: 'prod-2', name: 'Es Teh Susu Manis 500ml', category: 'minuman', price: 18000, unit: 'cup', stock: 45, image: '', description: 'Seduhan teh hitam premium berpadu dengan susu kental manis lembut dan es segar.' },
  { id: 'prod-3', name: 'Kopi Cold Brew Arabika 250ml', category: 'minuman', price: 24000, unit: 'botol', stock: 30, image: '', description: 'Kopi cold brew seduh dingin 16 jam dengan biji kopi Arabika murni rendah asam.' },
  { id: 'prod-4', name: 'Keripik Kentang Panggang BBQ 150g', category: 'camilan', price: 16500, unit: 'bungkus', stock: 60, image: '', description: 'Keripik kentang renyah bergelombang dengan bumbu tabur barbeque gurih lezat.' },
  { id: 'prod-5', name: 'Roti Croissant Mentega Gurih', category: 'camilan', price: 15000, unit: 'item', stock: 25, image: '', description: 'Pastry khas Prancis berlapis renyah dengan aroma mentega murni panggang hangat.' },
  { id: 'prod-6', name: 'Kukis Cokelat Lembut Lumer', category: 'camilan', price: 12000, unit: 'keping', stock: 40, image: '', description: 'Kukis lembut lumer (soft-baked) dengan limpahan choco chips cokelat Belgia.' },
  { id: 'prod-7', name: 'Apel Fuji Segar (Isi 3 Buah)', category: 'segar', price: 28000, unit: 'paket', stock: 18, image: '', description: 'Apel Fuji manis renyah kaya vitamin dan serat, disajikan segar pilihan terbaik.' },
  { id: 'prod-8', name: 'Pisang Cavendish Manis 1kg', category: 'segar', price: 22000, unit: 'kg', stock: 20, image: '', description: 'Pisang Cavendish kuning matang alami berkulit mulus dan bertekstur legit.' },
  { id: 'prod-9', name: 'Susu Sapi Murni Pasteurisasi 1L', category: 'olahan-susu', price: 26000, unit: 'karton', stock: 35, image: '', description: '100% susu segar murni pasteurisasi kaya kalsium untuk daya tahan tubuh keluarga.' },
  { id: 'prod-10', name: 'Telur Ayam Organik Omega-3 (Isi 10)', category: 'olahan-susu', price: 32000, unit: 'kotak', stock: 22, image: '', description: 'Telur segar peternakan bebas antibiotik dengan kandungan nutrisi Omega-3 tinggi.' },
  { id: 'prod-11', name: 'Sabun Mandi Cair Lidah Buaya 500ml', category: 'perawatan', price: 45000, unit: 'botol', stock: 15, image: '', description: 'Sabun cair pelembap kulit dengan ekstrak lidah buaya alami dan Vitamin E lembut.' },
  { id: 'prod-12', name: 'Pembersih Tangan Antiseptik Gel 100ml', category: 'perawatan', price: 12500, unit: 'botol', stock: 50, image: '', description: 'Gel pembersih tangan alkohol 70% efektif membunuh 99.9% kuman tanpa lengket.' },
  { id: 'prod-13', name: 'Semprotan Pembersih Serbaguna Citrus 500ml', category: 'kebutuhan-rumah', price: 27500, unit: 'botol', stock: 19, image: '', description: 'Cairan pembersih lantai dan meja anti-lemak beraroma jeruk nipis menyegarkan.' },
  { id: 'prod-14', name: 'Tisu Wajah Lembut 3 Lapis 200 Lembar', category: 'kebutuhan-rumah', price: 14000, unit: 'kotak', stock: 40, image: '', description: 'Tisu wajah lembut 3-ply dari serat alami murni yang higienis dan tidak mudah robek.' },
]

const DEFAULT_BANNERS: BannerSet = { landscape: [], square1: [], square2: [] }

export { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_BANNERS }

/* ---------- pricing ---------- */

export const isPromo = (p: Product): boolean => Number(p.discount || 0) > 0

export function effectivePrice(p: Product): number {
  const price = Number(p.price) || 0
  if (Number(p.salePrice) > 0) return Number(p.salePrice)
  const d = Number(p.discount) || 0
  if (d > 0) return Math.round(price * (1 - d / 100))
  return price
}

/* ---------- formatting ---------- */

export function rupiah(n: number): string {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

export function dateTimeICS(iso: string): string {
  return new Date(iso || Date.now()).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function dateTimeFull(iso: string): string {
  return new Date(iso || Date.now()).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
}

export function clockHM(iso: string): string {
  return new Date(iso || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/* ---------- geo pin helpers ---------- */

export function pinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
}

export function readPin(address: string): { lat: number; lng: number } | null {
  if (!address) return null
  const m = address.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  return null
}

export function hasPin(address: string): boolean {
  return readPin(address) !== null
}

/* ---------- whatsapp ---------- */

export function waLink(phone: string, text: string): string {
  const p = (phone || '').replace(/\D/g, '')
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}

export function orderMessage(
  customer: Partial<CustomerInfo>,
  items: CartItem[] | OrderItem[],
  orderId: string | null,
): string {
  const totalCount = items.reduce((a, i) => a + i.quantity, 0)
  const totalPrice = items.reduce((a, i) => a + i.price * i.quantity, 0)
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
  const line = '-------------------------------'
  let t = '🛒 PESANAN BARU — RAMA SWALAYAN\n'
  t += `📅 ${now}\n${line}\n`
  if (customer.name || customer.phone || customer.member || customer.address || customer.notes) {
    t += '👤 DATA PEMESAN\n'
    if (customer.name) t += `• Nama: ${customer.name}\n`
    if (customer.phone) t += `• No. WhatsApp: ${customer.phone}\n`
    if (customer.member) t += `• No. Member: ${customer.member}\n`
    if (customer.address) t += `• Alamat Kirim: ${customer.address}\n`
    if (customer.notes) t += `• Catatan: ${customer.notes}\n`
    t += `${line}\n`
  }
  t += `🛍️ DAFTAR ITEM (${totalCount} barang)\n`
  items.forEach((i, n) => {
    t += `${n + 1}. ${i.name}\n`
    t += `    ${i.quantity} ${i.unit || 'item'} x ${rupiah(i.price)} = ${rupiah(i.price * i.quantity)}\n`
    if (i.notes) t += `    ↳ Catatan: ${i.notes}\n`
  })
  t += `${line}\n💰 TOTAL ESTIMASI: ${rupiah(totalPrice)}\n${line}\n`
  if (orderId) t += `🔎 No. Pesanan: ${orderId}\n`
  t += 'Halo Rama Swalayan, saya ingin memesan barang di atas. Mohon konfirmasi ketersediaan & info pembayaran/ongkirnya ya. Terima kasih! 🙏'
  return t
}
