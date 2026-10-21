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
  /** member number — the browser form labels it "No. Member" */
  id: string
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
  CART: 'rama_customer_cart_v3',
  AUTH: 'rama_admin_token_v1',
  MY_ORDER_HISTORY: 'rama_my_order_history_v1',
  CUSTOMER_INFO: 'rama_customer_info_v1',
} as const

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
  if (customer.name || customer.phone || customer.id || customer.address || customer.notes) {
    t += '👤 DATA PEMESAN\n'
    if (customer.name) t += `• Nama: ${customer.name}\n`
    if (customer.phone) t += `• No. WhatsApp: ${customer.phone}\n`
    if (customer.id) t += `• No. Member: ${customer.id}\n`
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
