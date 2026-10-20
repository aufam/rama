import { For, Show, createMemo, createSignal } from 'solid-js'
import { useStore } from '../../store-context'

export default function Drawer() {
  const store = useStore()
  const [q, setQ] = createSignal('')

  const items = createMemo(() => {
    const list = Array<{ id: string; name: string; icon: string; promo: boolean }>()
    if (store.state.products.some(store.isPromo))
      list.push({ id: 'promo', name: 'Produk Promo', icon: 'fa-fire', promo: true })
    store.state.categories
      .filter((c) => c.id !== 'all')
      .forEach((c) => list.push({ id: c.id, name: c.name, icon: c.icon, promo: false }))
    const needle = q().trim().toLowerCase()
    return needle ? list.filter((i) => i.name.toLowerCase().includes(needle)) : list
  })

  return (
    <>
      <div class={`fade ${store.state.drawer ? 'on' : ''}`} onClick={store.closeDrawer} />
      <aside class={`drawer ${store.state.drawer ? 'on' : ''}`} aria-hidden={!store.state.drawer}>
        <div class="drawer-top">
          <h3><i class="fa-solid fa-layer-group"></i> Semua Kategori</h3>
          <button class="drawer-close" onClick={store.closeDrawer} aria-label="Tutup">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="drawer-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Cari kategori..." value={q()} onInput={(e) => setQ(e.currentTarget.value)} />
        </div>
        <div class="drawer-list">
          <button
            class={`drawer-item ${store.state.category === 'all' && !store.state.query ? 'on' : ''}`}
            onClick={() => { store.setQuery(''); store.setCategory('all') }}
          >
            <i class="fa-solid fa-layer-group"></i> Semua Produk
          </button>
          <div class="lbl">Pilihan Kategori</div>
          <For each={items()}>
            {(item) => (
              <button
                class={`drawer-item ${item.promo ? 'promo' : ''} ${store.state.category === item.id && !store.state.query ? 'on' : ''}`}
                onClick={() => { store.setQuery(''); store.setCategory(item.id) }}
              >
                <i class={`fa-solid ${item.icon}`}></i> {item.name}
              </button>
            )}
          </For>
          <Show when={items().length === 0}>
            <div class="empty3d" style="padding:24px 12px">
              <p>Kategori tidak ditemukan.</p>
            </div>
          </Show>
        </div>
      </aside>
    </>
  )
}
