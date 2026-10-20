import { For, Show, createMemo, createSignal } from 'solid-js'
import { useStore } from '../store-context'
import { STATUS_META, STATUS_ORDER, dateTimeICS, rupiah } from '../types'
import type { Order, Product } from '../types'
import ProductFormSheet from '../components/admin/ProductFormSheet'
import CsvSheet from '../components/admin/CsvSheet'
import OrderDetailSheet from '../components/admin/OrderDetailSheet'

const TABS = [
  { id: 'products', label: 'Produk', icon: 'fa-boxes-stacked' },
  { id: 'orders', label: 'Pesanan', icon: 'fa-receipt' },
  { id: 'banners', label: 'Banner', icon: 'fa-images' },
] as const

export default function AdminPage() {
  const store = useStore()

  return (
    <Show when={store.state.authed} fallback={<AdminLogin />}>
      <AdminShell />
    </Show>
  )
}

/* --------------------------------------------------------------- */
/* Login                                                            */
/* --------------------------------------------------------------- */

function AdminLogin() {
  const store = useStore()
  const [user, setUser] = createSignal('')
  const [pass, setPass] = createSignal('')
  const [busy, setBusy] = createSignal(false)

  return (
    <div class="admin-login">
      <form
        class="login-card"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await store.login(user().trim(), pass())
            store.toast('Selamat datang, Admin!')
          } catch {
            store.toast('Username atau password salah.', 'err')
          } finally {
            setBusy(false)
          }
        }}
      >
        <div class="login-badge"><i class="fa-solid fa-user-shield"></i></div>
        <h1>Panel Admin</h1>
        <p>Masuk untuk mengelola katalog & pesanan Rama Swalayan</p>

        <div class="field">
          <label>Username</label>
          <div class="inwrap">
            <i class="fa-solid fa-user"></i>
            <input class="in" autocomplete="username" value={user()} onInput={(e) => setUser(e.currentTarget.value)} />
          </div>
        </div>
        <div class="field">
          <label>Password</label>
          <div class="inwrap">
            <i class="fa-solid fa-key"></i>
            <input class="in" type="password" autocomplete="current-password" value={pass()} onInput={(e) => setPass(e.currentTarget.value)} />
          </div>
        </div>

        <button type="submit" class="btn btn-red" disabled={busy() || !user() || !pass()}>
          <i class={`fa-solid ${busy() ? 'fa-circle-notch fa-spin' : 'fa-right-to-bracket'}`}></i>
          {busy() ? 'Masuk...' : 'Masuk'}
        </button>
        <button type="button" class="side" style="margin:0 auto; display:inline-flex; gap:6px; align-items:center; font-size:.76rem; font-weight:700; color:var(--ink-soft);" onClick={() => store.navigate('home')}>
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Toko
        </button>
      </form>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Shell                                                            */
/* --------------------------------------------------------------- */

function AdminShell() {
  const store = useStore()
  const [sideOpen, setSideOpen] = createSignal(false)

  const go = (tab: string) => {
    console.log('[dbg] go() called with', tab)
    store.state.admin.tab = tab as 'products' | 'orders' | 'banners'
    console.log('[dbg] tab now', store.state.admin.tab)
    setSideOpen(false)
  }
  const orderCount = () => store.state.orders.filter((o) => o.status === 'received' || o.status === 'preparing').length

  return (
    <div class="admin">
      <header class="admin-top">
        <button class="amenu" onClick={() => setSideOpen(true)} aria-label="Menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="mini"><i class="fa-solid fa-shield-halved"></i></div>
        <div>
          <h1>Admin Rama Swalayan</h1>
          <p>Kelola katalog, pesanan & banner promo</p>
        </div>
        <div class="acts">
          <button class="pbtn" onClick={() => store.openForm(null)}>
            <i class="fa-solid fa-plus"></i> <span class="atag">Produk</span>
          </button>
        </div>
      </header>

      <div class="admin-wrap">
        <Show when={sideOpen()}>
          <div class="fade on" style="z-index:70;" onClick={() => setSideOpen(false)} />
        </Show>
        <aside class={`admin-side ${sideOpen() ? 'mobile on' : ''}`}>
          <div class="aside-brand">
            <div class="mini"><i class="fa-solid fa-shield-halved"></i></div>
            <div>
              <b>Admin Panel</b>
              <span>Rama Swalayan</span>
            </div>
          </div>
          <For each={TABS}>
            {(t) => (
              <button class="aside-item" classList={{ on: store.state.admin.tab === t.id }} onClick={() => go(t.id)}>
                <i class={`fa-solid ${t.icon}`}></i> {t.label}
                <Show when={t.id === 'orders' && orderCount() > 0}>
                  <span class="n">{orderCount()}</span>
                </Show>
              </button>
            )}
          </For>
          <button class="aside-item aside-out" onClick={() => { store.logout(); store.toast('Anda telah keluar.') }}>
            <i class="fa-solid fa-right-from-bracket"></i> Keluar
          </button>
        </aside>

        <main class="admin-main">
          <h1>{TABS.find((t) => t.id === store.state.admin.tab)?.label}</h1>
          <p class="cool">
            <Show when={store.state.admin.tab === 'products'}>Kelola katalog produk dan harga promo.</Show>
            <Show when={store.state.admin.tab === 'orders'}>Perbarui status pesanan pembeli secara real-time.</Show>
            <Show when={store.state.admin.tab === 'banners'}>Atur banner promo pada tiga slot halaman utama.</Show>
          </p>

          <Show when={store.state.admin.tab === 'products'}>
            <ProductsTab />
          </Show>
          <Show when={store.state.admin.tab === 'orders'}>
            <OrdersTab />
          </Show>
          <Show when={store.state.admin.tab === 'banners'}>
            <BannersTab />
          </Show>
        </main>
      </div>

      <ProductFormSheet />
      <CsvSheet />
      <OrderDetailSheet />
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Products tab                                                     */
/* --------------------------------------------------------------- */

function ProductsTab() {
  const store = useStore()

  const stats = createMemo(() => [
    { label: 'Total Produk', value: store.state.products.length, icon: 'fa-boxes-stacked', tone: 'green' },
    { label: 'Sedang Promo', value: store.state.products.filter(store.isPromo).length, icon: 'fa-fire', tone: 'amber' },
    { label: 'Stok Habis', value: store.state.products.filter((p) => p.stock <= 0).length, icon: 'fa-ban', tone: 'red' },
    { label: 'Kategori', value: store.state.categories.filter((c) => c.id !== 'all').length, icon: 'fa-layer-group', tone: 'violet' },
  ])

  const filtered = createMemo<Product[]>(() => {
    let list = store.state.products.slice()
    if (store.state.admin.cat !== 'all') list = list.filter((p) => p.category === store.state.admin.cat)
    const q = store.state.admin.search.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    return list
  })

  async function remove(p: Product) {
    if (!window.confirm(`Hapus produk "${p.name}"? Tindakan ini permanen.`)) return
    try {
      await store.deleteProduct(p.id)
    } catch {
      store.toast('Gagal menghapus produk.', 'err')
    }
  }

  const TONE_FG: Record<string, string> = { green: '--brand-700', amber: '--amber', red: '--red', violet: '--violet', blue: '--blue' }
  const tone = (t: string) => ({ green: 'green-soft', amber: 'amber-soft', red: 'red-soft', violet: 'violet-soft', blue: 'blue-soft' })[t] || 'green-soft'

  return (
    <>
      <div class="stats">
        <For each={stats()}>
          {(s) => (
            <div class="stat">
              <div class="ic" style={`background: var(--${tone(s.tone)}); color: var(${TONE_FG[s.tone] || '--brand-700'});`}>
                <i class={`fa-solid ${s.icon}`}></i>
              </div>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          )}
        </For>
      </div>

      <div class="admin-card">
        <div class="admin-filters">
          <div class="afilter">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input placeholder="Cari kode / nama produk..." value={store.state.admin.search} onInput={(e) => { store.state.admin.search = e.currentTarget.value }} />
          </div>
          <div class="afilter">
            <i class="fa-solid fa-layer-group"></i>
            <select value={store.state.admin.cat} onChange={(e) => { store.state.admin.cat = e.currentTarget.value }} style="width:100%; background:var(--cream); border:1.5px solid transparent; border-radius:14px; padding:10px 12px; font-size:.8rem; font-weight:500; outline:none; appearance:none;">
              <option value="all">Semua kategori</option>
              <For each={store.state.categories.filter((c) => c.id !== 'all')}>
                {(c) => <option value={c.id}>{c.name}</option>}
              </For>
            </select>
          </div>
        </div>

        <div class="plist">
          <Show
            when={filtered().length > 0}
            fallback={<div class="empty3d"><div class="bubble"><i class="fa-solid fa-box-open"></i></div><h3>Tidak ada produk</h3><p>Ubah filter atau tambahkan produk baru.</p></div>}
          >
            <For each={filtered()}>
              {(p) => (
                <div class="prow">
                  <div class="thumb">
                    <Show when={p.image} fallback={<i class="fa-solid fa-image"></i>}>
                      <img src={p.image} alt={p.name} loading="lazy" />
                    </Show>
                  </div>
                  <div class="body">
                    <div class="row1">
                      <h4>{p.name}</h4>
                      <span class="tag idtag">{p.id}</span>
                      <Show when={store.isPromo(p)}><span class="tag disc">-{p.discount}%</span></Show>
                      <Show when={p.stock <= 0}><span class="tag" style="background:var(--red-50); color:var(--red);">Habis</span></Show>
                    </div>
                    <p class="desc">{p.description}</p>
                    <div class="row2">
                      <span class="price">
                        <Show when={store.isPromo(p)}>
                          <s>{rupiah(p.price)}</s>
                        </Show>
                        <b classList={{ sale: store.isPromo(p) }}>{rupiah(store.effectivePrice(p))}</b>
                        <span>/{p.unit}</span>
                      </span>
                      <span class="tag">{store.state.categories.find((c) => c.id === p.category)?.name || p.category}</span>
                      <div class="acts">
                        <button class="pbtn" onClick={() => store.openForm(p)}><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="pbtn danger" onClick={() => void remove(p)}><i class="fa-solid fa-trash"></i> Hapus</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- */
/* Orders tab                                                       */
/* --------------------------------------------------------------- */

function OrdersTab() {
  const store = useStore()

  const filtered = createMemo<Order[]>(() => {
    let list = store.state.orders.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (store.state.admin.status !== 'all') list = list.filter((o) => o.status === store.state.admin.status)
    const q = store.state.admin.orderSearch.trim().toLowerCase()
    if (q) list = list.filter((o) =>
      o.id.toLowerCase().includes(q)
      || (o.customer.name || '').toLowerCase().includes(q)
      || (o.customer.phone || '').toLowerCase().includes(q))
    return list
  })

  const counts = () => STATUS_ORDER.map((s) => ({ s, n: store.state.orders.filter((o) => o.status === s).length }))

  async function setStatus(id: string, status: string) {
    try {
      await store.updateOrderStatus(id, status)
      store.toast(`Status ${id} → ${STATUS_META[status]?.label ?? status}`)
    } catch {
      store.toast('Gagal memperbarui status.', 'err')
    }
  }

  async function remove(o: Order) {
    if (!window.confirm(`Hapus pesanan ${o.id}?`)) return
    try {
      await store.deleteOrder(o.id)
    } catch {
      store.toast('Gagal menghapus pesanan.', 'err')
    }
  }

  return (
    <>
      <div class="stats">
        <For each={counts()}>
          {(c) => (
            <div class="stat">
              <div class="ic" style={`background: var(--${toneOf(c.s)}); color: var(--${metaColor(c.s)});`}>
                <i class={`fa-solid ${STATUS_META[c.s].icon}`}></i>
              </div>
              <b>{c.n}</b>
              <span>{STATUS_META[c.s].label}</span>
            </div>
          )}
        </For>
      </div>

      <div class="admin-card">
        <div class="admin-filters">
          <div class="afilter">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input placeholder="Cari id / nama / no. HP..." value={store.state.admin.orderSearch} onInput={(e) => { store.state.admin.orderSearch = e.currentTarget.value }} />
          </div>
          <div class="afilter">
            <i class="fa-solid fa-filter"></i>
            <select value={store.state.admin.status} onChange={(e) => { store.state.admin.status = e.currentTarget.value }} style="width:100%; background:var(--cream); border:1.5px solid transparent; border-radius:14px; padding:10px 12px; font-size:.8rem; font-weight:500; outline:none; appearance:none;">
              <option value="all">Semua status</option>
              <For each={STATUS_ORDER}>{(s) => <option value={s}>{STATUS_META[s].label}</option>}</For>
            </select>
          </div>
          <button class="pbtn" style="flex:none;" onClick={() => void store.loadOrders().then(() => store.toast('Pesanan diperbarui.'))}>
            <i class="fa-solid fa-rotate"></i> Muat ulang
          </button>
        </div>

        <Show
          when={filtered().length > 0}
          fallback={<div class="empty3d"><div class="bubble"><i class="fa-solid fa-inbox"></i></div><h3>Belum ada pesanan</h3><p>Pesanan pembeli akan muncul di sini.</p></div>}
        >
          <div class="plist">
            <For each={filtered()}>
              {(o) => (
                <div class="orow">
                  <div class="orow-top">
                    <div>
                      <div class="id">{o.id}</div>
                      <div class="dt">{dateTimeICS(o.createdAt)}</div>
                    </div>
                    <div class="pay">
                      <b>{rupiah(o.totalPrice)}</b>
                      <span>{o.totalCount} barang</span>
                    </div>
                  </div>
                  <div class="orow-cust">
                    <span><b>{o.customer.name}</b></span>
                    <span>{o.customer.phone}</span>
                  </div>
                  <div class="orow-foot">
                    <select
                      class="pill-select"
                      value={o.status}
                      onChange={(e) => void setStatus(o.id, e.currentTarget.value)}
                    >
                      <For each={STATUS_ORDER}>{(s) => <option value={s}>{STATUS_META[s].label}</option>}</For>
                    </select>
                    <div class="acts">
                      <button class="pbtn" onClick={() => { store.state.admin.details = o }}>
                        <i class="fa-solid fa-eye"></i> Detail
                      </button>
                      <a
                        class="pbtn"
                        href={`https://wa.me/${(o.customer.phone || '').replace(/\D/g, '').replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i class="fa-brands fa-whatsapp"></i>
                      </a>
                      <button class="pbtn danger" onClick={() => void remove(o)}>
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </>
  )
}

const TONE_BG: Record<string, string> = {
  blue: '--blue-soft',
  amber: '--amber-soft',
  violet: '--violet-soft',
  green: '--green-soft',
  red: '--red-soft',
}
const TONE_FG: Record<string, string> = {
  blue: '--blue',
  amber: '--amber',
  violet: '--violet',
  green: '--brand-700',
  red: '--red',
}
function toneOf(status: string): string {
  return TONE_BG[(STATUS_META[status]?.tone)] ?? '--blue-soft'
}
function metaColor(status: string): string {
  return TONE_FG[(STATUS_META[status]?.tone)] ?? '--blue'
}

/* --------------------------------------------------------------- */
/* Banners tab                                                      */
/* --------------------------------------------------------------- */

const SLOTS = [
  { id: 'landscape', label: 'Landscape (Atas)', icon: 'fa-rectangle-horizontal', ratio: 'Rasio ±2.35:1 — banner utama' },
  { id: 'square1', label: 'Kotak Kiri', icon: 'fa-square', ratio: 'Rasio 1:1 — kartu promo kiri' },
  { id: 'square2', label: 'Kotak Kanan', icon: 'fa-square', ratio: 'Rasio 1:1 — kartu promo kanan' },
] as const

function BannersTab() {
  const store = useStore()
  const [busy, setBusy] = createSignal('')

  async function add(slot: 'landscape' | 'square1' | 'square2', files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setBusy(slot)
    try {
      const url = await store.uploadImage(file)
      const banners = { ...store.state.banners, [slot]: [...store.state.banners[slot], url] } as typeof store.state.banners
      await store.saveBanners(banners)
      store.toast('Banner ditambahkan.')
    } catch {
      store.toast('Gagal mengunggah banner.', 'err')
    } finally {
      setBusy('')
    }
  }

  async function move(slot: 'landscape' | 'square1' | 'square2', index: number, dir: -1 | 1) {
    const arr = [...store.state.banners[slot]]
    const j = index + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[index], arr[j]] = [arr[j], arr[index]]
    await store.saveBanners({ ...store.state.banners, [slot]: arr } as typeof store.state.banners)
  }

  async function del(slot: 'landscape' | 'square1' | 'square2', index: number) {
    const arr = store.state.banners[slot].filter((_, i) => i !== index)
    await store.saveBanners({ ...store.state.banners, [slot]: arr } as typeof store.state.banners)
    store.toast('Banner dihapus.')
  }

  return (
    <>
      <div class="bnote">
        <i class="fa-solid fa-circle-info"></i>
        <span>
          Unggah banner yang <b>menarik & rapi</b>. Landscape tampil penuh di atas beranda,
          dua kotak tampil berdampingan di bawahnya.
        </span>
      </div>
      <div class="bslots">
        <For each={SLOTS}>
          {(slot) => (
            <div class="bslot">
              <h4><i class={`fa-solid ${slot.icon}`}></i> {slot.label}</h4>
              <span class="ratio">{slot.ratio}</span>
              <div class="bimgs">
                <For each={store.state.banners[slot.id]} fallback={<div class="bempty">Belum ada banner pada slot ini</div>}>
                  {(src, i) => (
                    <div class="bimg">
                      <img src={src} alt={`Banner ${slot.id}-${i() + 1}`} loading="lazy" />
                      <div class="ovl">
                        <button disabled={i() === 0} onClick={() => void move(slot.id, i(), -1)} aria-label="Geser kiri"><i class="fa-solid fa-arrow-left"></i></button>
                        <button class="del" onClick={() => void del(slot.id, i())} aria-label="Hapus"><i class="fa-solid fa-trash"></i></button>
                        <button disabled={i() === store.state.banners[slot.id].length - 1} onClick={() => void move(slot.id, i(), 1)} aria-label="Geser kanan"><i class="fa-solid fa-arrow-right"></i></button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <button class="pbtn" style="justify-content:center;" onClick={() => pickers[slot.id]?.click()}>
                <i class={`fa-solid ${busy() === slot.id ? 'fa-circle-notch fa-spin' : 'fa-plus'}`}></i>
                {busy() === slot.id ? 'Mengunggah...' : 'Tambah banner'}
              </button>
              <input
                ref={(el) => { pickers[slot.id] = el }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => { void add(slot.id, e.currentTarget.files); e.currentTarget.value = '' }}
              />
            </div>
          )}
        </For>
      </div>
    </>
  )
}

const pickers: Record<string, HTMLInputElement | undefined> = {}
