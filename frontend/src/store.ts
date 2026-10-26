/* Reactive application store + backend API layer.
   All state lives in one Solid store; components read fields directly and stay reactive. */

import { createMemo } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import {
  ADMIN_WA,
  STORAGE_KEYS,
  effectivePrice,
  hasPin,
  isPromo,
  orderMessage,
  readPin,
  waLink,
  type BannerSet,
  type CartItem,
  type Category,
  type CustomerInfo,
  type Order,
  type OrderStatus,
  type Product,
  type ProductDraft,
} from './types'

export type View = 'home' | 'cart' | 'history'

export interface AppState {
  /* routing */
  view: View
  trackId: string
  /* catalogue data */
  categories: Category[]
  products: Product[]
  banners: BannerSet
  orders: Order[]
  /* shopper data */
  cart: CartItem[]
  customer: CustomerInfo | null
  history: Order[]
  /* home filters */
  query: string
  category: string // 'all' | 'promo' | category id
  /* UI flags */
  drawer: boolean
  detail: Product | null
  checkout: boolean
  done: Order | null
  toast: { msg: string; kind: 'ok' | 'err' } | null
  /* admin */
  authed: boolean
  admin: {
    tab: 'products' | 'orders' | 'banners'
    search: string
    cat: string
    orderSearch: string
    status: string
    form: ProductDraft | null
    formBusy: boolean
    imgBusy: boolean
    csv: 'download' | 'upload' | null
    csvBusy: boolean
    details: Order | null
  }
}

function readToken(): string | null {
  try { return localStorage.getItem(STORAGE_KEYS.AUTH) } catch { return null }
}

function readQuery(name: string): string {
  return new URLSearchParams(window.location.search).get(name) || ''
}

function readRoute(): { view: View; id: string } {
  const v = readQuery('view')
  const view = (['home', 'cart', 'history'].includes(v) ? v : 'home') as View
  return { view, id: readQuery('id') }
}

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function lsWrite(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

export function createAppStore() {
  const initialRoute = readRoute()

  const [state, setState] = createStore<AppState>({
    view: initialRoute.view,
    trackId: initialRoute.id,
    categories: [],
    products: [],
    banners: { landscape: [], square1: [], square2: [] },
    orders: [],
    cart: lsRead(STORAGE_KEYS.CART, []),
    customer: lsRead(STORAGE_KEYS.CUSTOMER_INFO, null),
    history: lsRead(STORAGE_KEYS.MY_ORDER_HISTORY, []),
    query: readQuery('q'),
    category: readQuery('category') || 'all',
    drawer: false,
    detail: null,
    checkout: false,
    done: null,
    toast: null,
    authed: Boolean(readToken()),
    admin: {
      tab: 'products',
      search: '',
      cat: 'all',
      orderSearch: '',
      status: 'all',
      form: null,
      formBusy: false,
      imgBusy: false,
      csv: null,
      csvBusy: false,
      details: null,
    },
  })

  /* cart totals as reactive memos */
  const cartCount = createMemo(() => state.cart.reduce((a, i) => a + i.quantity, 0))
  const cartTotal = createMemo(() => state.cart.reduce((a, i) => a + i.price * i.quantity, 0))

  let toastTimer: ReturnType<typeof setTimeout> | undefined
  function toast(msg: string, kind: 'ok' | 'err' = 'ok'): void {
    setState('toast', { msg, kind })
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => setState('toast', null), 2800)
  }

  /* ------------------------------------------------------------------
     Routing (query params so a single static file works anywhere)
  ------------------------------------------------------------------ */
  function syncUrl(replace = false): void {
    const p = new URLSearchParams()
    if (state.view !== 'home') p.set('view', state.view)
    if (state.view === 'home' && state.category !== 'all') p.set('category', state.category)
    if (state.view === 'home' && state.query) p.set('q', state.query)
    const qs = p.toString()
    const url = `${window.location.pathname}${qs ? '?' + qs : ''}`
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
  }

  function navigate(view: View | 'tracking', opts: { id?: string; keepFilters?: boolean } = {}): void {
    /* tracking is its own document (tracking.html) */
    if (view === 'tracking') {
      const id = (opts.id || '').trim()
      const qs = id ? `?id=${encodeURIComponent(id)}` : ''
      if (window.location.pathname.endsWith('tracking.html')) {
        /* in-place: sync the URL and the reactive track id (the page re-fetches) */
        setState('trackId', id)
        window.history.replaceState(null, '', `tracking.html${qs}`)
      } else {
        window.location.assign(`tracking.html${qs}`)
      }
      return
    }
    /* navigating home/cart/history from the tracking page goes back to the storefront */
    if (window.location.pathname.endsWith('tracking.html')) {
      window.location.assign(view === 'home' ? 'index.html' : `index.html?view=${view}`)
      return
    }

    setState('view', view)
    /* coming back to the storefront always starts from a clean slate */
    if (view === 'home' && !opts.keepFilters) {
      setState('query', '')
      setState('category', 'all')
    }
    syncUrl()
    window.scrollTo({ top: 0 })
  }

  function handlePopState(): void {
    const r = readRoute()
    setState('view', r.view)
    setState('trackId', r.id)
    const params = new URLSearchParams(window.location.search)
    setState('category', params.get('category') || 'all')
    setState('query', params.get('q') || '')
    window.scrollTo({ top: 0 })
  }

  function setCategory(id: string): void {
    setState('category', state.view === 'home' ? id : 'all')
    setState('drawer', false)
    if (state.view === 'home') syncUrl()
  }

  function setQuery(q: string): void {
    setState('query', q)
    if (state.view === 'home') syncUrl(true)
  }

  /* ------------------------------------------------------------------
     Backend plumbing
  ------------------------------------------------------------------ */
  const tokenHeader = (): Record<string, string> => ({ Authorization: `Bearer ${readToken() || ''}` })

  function handleError(e: unknown, fallback: string): Error {
    const msg = e instanceof Error ? e.message : String(e)
    return new Error(msg.includes('401') ? 'Sesi berakhir — silakan login ulang.' : fallback)
  }

  async function request(url: string, opts: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, opts)
    if (!res.ok) {
      if (res.status === 401) {
        setState('authed', false)
        try { localStorage.removeItem(STORAGE_KEYS.AUTH) } catch { /* noop */ }
      }
      throw new Error(`HTTP ${res.status}`)
    }
    return res
  }

  /* ---- catalogue fetchers ---- */
  async function loadCategories(): Promise<void> {
    try {
      const res = await request('api/categories')
      const categories: Category[] = await res.json()
      setState('categories', categories)
    } catch (e) {
      toast(handleError(e, 'Gagal memuat kategori').message, 'err')
    }
  }

  async function loadProducts(): Promise<void> {
    try {
      const res = await request('api/products')
      const products: Product[] = await res.json()
      setState('products', products)
      syncCartPrices(products)
    } catch (e) {
      toast(handleError(e, 'Gagal memuat produk').message, 'err')
    }
  }

  async function loadBanners(): Promise<void> {
    try {
      const res = await request('api/banners')
      const banners: BannerSet = await res.json()
      setState('banners', { landscape: banners.landscape || [], square1: banners.square1 || [], square2: banners.square2 || [] })
    } catch (e) {
      toast(handleError(e, 'Gagal memuat banner').message, 'err')
    }
  }

  async function loadOrders(): Promise<void> {
    try {
      const res = await request('api/auth/orders', { headers: tokenHeader() })
      const orders: Order[] = await res.json()
      setState('orders', orders)
    } catch (e) {
      if (state.authed) toast(handleError(e, 'Gagal memuat pesanan').message, 'err')
    }
  }

  function syncCartPrices(products: Product[]): void {
    if (!state.cart.length) return
    const byId = new Map(products.map((p) => [p.id, p]))
    setState('cart', (prev) =>
      prev
        .filter((c) => byId.has(c.id))
        .map((c) => ({ ...c, price: byId.get(c.id) ? effectivePrice(byId.get(c.id)!) : c.price })),
    )
    lsWrite(STORAGE_KEYS.CART, state.cart)
  }

  /* ---- boot ---- */
  async function boot(): Promise<void> {
    void loadCategories()
    void loadProducts()
    void loadBanners()
    if (state.authed) void loadOrders()
  }

  /* ------------------------------------------------------------------
     Cart
  ------------------------------------------------------------------ */
  function persistCart(): void {
    lsWrite(STORAGE_KEYS.CART, state.cart)
  }

  function addToCart(product: Product, quantity = 1, notes = ''): void {
    const clean = (notes || '').trim()
    const price = effectivePrice(product)
    setState('cart', produce((cart) => {
      const ix = cart.findIndex((c) => c.id === product.id && (c.notes || '') === clean)
      if (ix > -1) cart[ix].quantity += quantity
      else cart.push({ id: product.id, name: product.name, category: product.category, price, unit: product.unit || 'item', image: product.image || '', quantity, notes: clean })
    }))
    persistCart()
  }

  function bumpItem(index: number, delta: number): void {
    setState('cart', produce((cart) => {
      const item = cart[index]
      if (!item) return
      item.quantity += delta
      if (item.quantity <= 0) cart.splice(index, 1)
    }))
    persistCart()
  }

  function removeItem(index: number): void {
    setState('cart', (cart) => {
      const next = cart.slice()
      next.splice(index, 1)
      return next
    })
    persistCart()
  }

  function clearCart(): void {
    setState('cart', [])
    persistCart()
  }

  function detailQty(index: number): CartItem {
    return state.cart[index]
  }

  /* ------------------------------------------------------------------
     Orders (customer side)
  ------------------------------------------------------------------ */
  function finish(order: Order): void {
    setState('done', order)
  }


  function saveCustomer(info: CustomerInfo): void {
    setState('customer', info)
    lsWrite(STORAGE_KEYS.CUSTOMER_INFO, info)
  }

  /** Refresh my order statuses from the server (history page refresh button).
      Returns how many statuses actually changed; throws when nothing loaded. */
  async function refreshMyOrders(): Promise<number> {
    const ids = [...new Set(state.history.map((o) => o?.id).filter(Boolean))]
    if (!ids.length) return 0
    const results = await Promise.allSettled(ids.map(async (id) => {
      const res = await fetch(`api/order?id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as Order
    }))
    const ok = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<Order>[]
    if (!ok.length) throw new Error('Gagal menyegarkan status pesanan.')
    let changed = 0
    for (const r of ok) {
      const fresh = r.value
      if (!fresh?.id) continue
      const prev = state.history.find((o) => o.id === fresh.id)
      if (prev && prev.status !== fresh.status) changed++
      const status = fresh.status
      const updatedAt = fresh.updatedAt || new Date().toISOString()
      setState('history', (hist) => hist.map((o) => (o.id === fresh.id ? { ...o, status, updatedAt } : o)))
      setState('orders', (orders) => orders.map((o) => (o.id === fresh.id ? { ...o, status, updatedAt } : o)))
    }
    lsWrite(STORAGE_KEYS.MY_ORDER_HISTORY, state.history)
    return changed
  }

  function addToHistory(order: Order): void {
    if (!order?.id) return
    setState('history', [order, ...state.history.filter((o) => o.id !== order.id)])
    lsWrite(STORAGE_KEYS.MY_ORDER_HISTORY, state.history)
  }

  async function findOrder(id: string): Promise<Order | null> {
    if (!id) return null
    try {
      const res = await fetch(`api/order?id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as Order
    } catch (e) {
      toast(handleError(e, 'Gagal memuat pesanan — periksa koneksi & nomor pesanan.').message, 'err')
      return null
    }
  }

  async function createOrder(info: CustomerInfo, items: CartItem[]): Promise<Order> {
    const totalCount = items.reduce((a, i) => a + i.quantity, 0)
    const totalPrice = items.reduce((a, i) => a + i.price * i.quantity, 0)
    /** fallback id in case the response is missing one (backend assigns the real id) */
    const payload = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'received' as OrderStatus,
      customer: {
        id: (info.id || '').trim(),
        name: (info.name || 'Pelanggan Rama').trim(),
        phone: (info.phone || '').trim(),
        address: (info.address || '').trim(),
        notes: (info.notes || '').trim(),
      },
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, unit: i.unit || 'item', quantity: i.quantity, notes: i.notes || '' })),
      totalCount,
      totalPrice,
    }
    const res = await fetch('api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    /* the backend only returns { "id": "<created id>" } — merge it into the
       payload so the caller gets a valid, complete Order object */
    const json = await res.json() as { id: string }
    return {
      ...payload,
      id: json.id,
    }
  }

  /* ------------------------------------------------------------------
     Admin API
  ------------------------------------------------------------------ */
  async function login(username: string, password: string): Promise<void> {
    const res = await fetch('api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    if (!res.ok) throw new Error('Username atau password salah.')
    const json = await res.json()
    try { localStorage.setItem(STORAGE_KEYS.AUTH, json.token) } catch { /* noop */ }
    setState('authed', true)
    void loadOrders()
  }

  function logout(): void {
    try { localStorage.removeItem(STORAGE_KEYS.AUTH) } catch { /* noop */ }
    setState('authed', false)
    /* stays on the admin page — the login screen takes over */
    toast('Anda telah keluar.')
  }

  function draftFrom(product: Product | null): ProductDraft {
    if (!product) return { id: '', name: '', barcode: '', category: state.categories.find((c) => c.id !== 'all')?.id || '', price: '', discount: '', salePrice: '', unit: '', image: '', description: '' }
    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode || '',
      category: product.category,
      price: String(product.price ?? ''),
      discount: String(product.discount ?? 0),
      salePrice: String(product.salePrice ?? ''),
      unit: product.unit || '',
      image: product.image || '',
      description: product.description || '',
    }
  }

  function openForm(product: Product | null): void {
    setState('admin', 'form', draftFrom(product))
  }

  /** One prod-safe write helper for every admin-panel field. */
  function patchAdmin(patch: Partial<AppState['admin']>): void {
    setState('admin', patch)
  }

  function openCsv(mode: 'download' | 'upload' | null): void {
    setState('admin', 'csv', mode)
  }

  function patchForm(key: keyof ProductDraft, value: string): void {
    setState('admin', 'form', key, value as never)
  }

  function closeForm(): void {
    setState('admin', 'form', null)
  }

  function setImage(image: string): void {
    setState('admin', 'form', 'image', image)
  }

  async function submitForm(): Promise<void> {
    const f = state.admin.form
    if (!f) return
    const out = {
      id: f.id.trim(),
      name: f.name.trim(),
      barcode: f.barcode.trim() || '',
      category: f.category,
      price: parseInt(f.price, 10) || 0,
      discount: parseInt(f.discount, 10) || 0,
      salePrice: parseInt(f.salePrice, 10) || 0,
      unit: f.unit.trim() || 'item',
      image: f.image,
      description: f.description.trim(),
    }
    if (!out.id || !out.name) { toast('Kode dan nama produk wajib diisi.', 'err'); return }
    if (Number.isNaN(out.price)) { toast('Harga tidak valid.', 'err'); return }
    if (out.discount > 0 && out.salePrice <= 0 && !f.salePrice) {
      out.salePrice = Math.round(out.price * (1 - out.discount / 100))
    }
    setState('admin', 'formBusy', true)
    try {
      await request('api/auth/products', {
        method: 'POST',
        headers: { ...tokenHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(out),
      })
      saveProduct(out as unknown as Product)
      closeForm()
      toast('Produk tersimpan.')
    } catch (e) {
      toast(handleError(e, 'Gagal menyimpan produk').message, 'err')
    } finally {
      setState('admin', 'formBusy', false)
    }
  }

  function saveProduct(product: Product): void {
    const products = state.products.slice()
    const ix = products.findIndex((p) => p.id === product.id)
    if (ix > -1) products[ix] = product
    else products.unshift(product)
    setState('products', products)
  }

  async function deleteProduct(id: string): Promise<void> {
    await request('api/auth/products', { method: 'DELETE', headers: { ...tokenHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setState('products', (prev) => prev.filter((p) => p.id !== id))
    toast('Produk dihapus.')
  }

  async function uploadImage(file: File): Promise<string> {
    const res = await request('api/auth/images', { method: 'POST', headers: tokenHeader(), body: file })
    const json = await res.json()
    return json.url as string
  }

  async function saveBanners(banners: BannerSet): Promise<void> {
    await request('api/auth/banners', { method: 'POST', headers: { ...tokenHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(banners) })
    setState('banners', banners)
  }

  async function downloadCsv(pass: string): Promise<void> {
    const res = await request('api/auth/tables', { headers: { ...tokenHeader(), 'X-Pass': pass } })
    const blob = await res.blob()
    const name = decodeURIComponent(new URL(res.url).pathname.split('/').pop() || 'tables.csv')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploadCsv(file: File, pass: string): Promise<void> {
    await request('api/auth/tables', { method: 'POST', headers: { ...tokenHeader(), 'X-Pass': pass, 'Content-Type': 'text/csv' }, body: file })
  }

  async function updateOrderStatus(id: string, status: string): Promise<void> {
    const order = state.orders.find((o) => o.id.toUpperCase() === id.toUpperCase())
    if (!order) throw new Error('Pesanan tidak ditemukan.')
    const next = { ...order, status, updatedAt: new Date().toISOString() }
    await request('api/auth/orders', { method: 'POST', headers: { ...tokenHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    setState('orders', (orders) => {
      const idx = orders.findIndex((o) => o.id.toUpperCase() === id.toUpperCase())
      if (idx === -1) return [...orders, next]
      return orders.map((o, i) => (i === idx ? next : o))
    })
  }

  async function deleteOrder(id: string): Promise<void> {
    await request('api/auth/orders', { method: 'DELETE', headers: { ...tokenHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setState('orders', (orders) => orders.filter((o) => o.id !== id))
    toast('Pesanan dihapus.')
  }

  /* ------------------------------------------------------------------
     Public API surface
  ------------------------------------------------------------------ */
  return {
    /* reactive state (read directly in components) */
    state,
    /* routing & nav */
    navigate,
    handlePopState,
    setCategory,
    setQuery,
    openDrawer: () => setState('drawer', true),
    closeDrawer: () => setState('drawer', false),
    openDetail: (p: Product) => setState('detail', p),
    closeDetail: () => setState('detail', null),
    openCheckout: () => { setState('done', null); setState('checkout', true) },
    closeCheckout: () => setState('checkout', false),
    finish,
    /* derived */
    cartCount,
    cartTotal,
    isPromo,
    effectivePrice,
    hasPin,
    readPin,
    /* cart */
    addToCart,
    bumpItem,
    removeItem,
    clearCart,
    detailQty,
    /* toast */
    toast,
    /* data */
    boot,
    loadCategories,
    loadProducts,
    loadBanners,
    loadOrders,
    findOrder,
    createOrder,
    refreshMyOrders,
    saveCustomer,
    addToHistory,
    updateOrderStatus,
    deleteOrder,
    productById: (id: string) => state.products.find((p) => p.id === id) ?? null,
    /* admin */
    adminWa: ADMIN_WA,
    patchAdmin,
    openCsv,
    patchForm,
    login,
    logout,
    openForm,
    closeForm,
    setImage,
    submitForm,
    deleteProduct,
    uploadImage,
    saveBanners,
    downloadCsv,
    uploadCsv,
  }
}

export type Store = ReturnType<typeof createAppStore>
