import { For, Show, createMemo } from 'solid-js'
import { useStore } from '../store-context'
import ProductCard from '../components/catalog/ProductCard'
import BannerPager from '../components/catalog/BannerPager'
import { progressive } from '../components/ui/progressive'
import { isPromo, type Product } from '../types'

/* parity with the vanilla kiosk.js lazy rendering */
const CAT_RENDER_BATCH = 3 // 3 category sections per scroll batch
const GRID_RENDER_BATCH = 20 // 20 products per scroll batch on filtered views
const PRODUCTS_PER_SECTION = 8

export default function HomePage() {
  const store = useStore()

  const filtered = () => store.state.category !== 'all' || store.state.query.trim().length > 0

  const list = createMemo<Product[]>(() => {
    let items = store.state.products.slice()
    if (store.state.category === 'promo') items = items.filter(isPromo)
    else if (store.state.category !== 'all')
      items = items.filter((p) => p.category === store.state.category)
    const q = store.state.query.trim().toLowerCase()
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    return items
  })

  const promos = createMemo(() => store.state.products.filter(isPromo))

  const sections = createMemo(() =>
    store.state.categories
      .filter((c) => c.id !== 'all')
      .map((c) => ({ cat: c, items: store.state.products.filter((p) => p.category === c.id) }))
      .filter((s) => s.items.length > 0),
  )

  /* lazy batches (vanilla parity) — reset when the visitor changes filter */
  const gridPg = progressive(() => list().length, GRID_RENDER_BATCH, () => `${store.state.category}|${store.state.query}`)
  const secPg = progressive(() => sections().length, CAT_RENDER_BATCH, () => store.state.category)

  const landscape = () => store.state.banners.landscape.filter(Boolean)
  const sq1 = () => store.state.banners.square1.filter(Boolean)
  const sq2 = () => store.state.banners.square2.filter(Boolean)
  const showBanners = () => !filtered() && (landscape().length > 0 || sq1().length > 0 || sq2().length > 0)

  const catIcon = (id: string) => {
    if (id === 'promo') return 'fa-fire'
    return store.state.categories.find((c) => c.id === id)?.icon ?? 'fa-box'
  }
  const catName = (id: string) => {
    if (id === 'promo') return 'Produk Promo'
    return store.state.categories.find((c) => c.id === id)?.name ?? id
  }

  return (
    <>
      <div class="chips">
        <div class="chip-rail">
          <button class="chip" classList={{ on: store.state.category === 'all' && !store.state.query }} onClick={() => { store.setQuery(''); store.setCategory('all') }}>
            <i class="fa-solid fa-layer-group"></i> Semua
          </button>
          <Show when={promos().length > 0}>
            <button class="chip chip-promo" classList={{ on: store.state.category === 'promo' && !store.state.query }} onClick={() => { store.setQuery(''); store.setCategory('promo') }}>
              <i class="fa-solid fa-fire"></i> Promo
            </button>
          </Show>
          <For each={store.state.categories.filter((c) => c.id !== 'all')}>
            {(c) => (
              <button class="chip" classList={{ on: store.state.category === c.id && !store.state.query }} onClick={() => { store.setQuery(''); store.setCategory(c.id) }}>
                <i class={`fa-solid ${c.icon}`}></i> {c.name}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={showBanners()}>
        <div class="banners">
          <Show when={landscape().length}>
            <BannerPager images={landscape()} />
          </Show>
          <Show when={sq1().length || sq2().length}>
            <div class="sq-row">
              <Show when={sq1().length}><BannerPager images={sq1()} /></Show>
              <Show when={sq2().length}><BannerPager images={sq2()} /></Show>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={!filtered() && promos().length > 0}>
        <section>
          <div class="section-head promo">
            <h2><i class="fa-solid fa-fire"></i> Lagi Promo</h2>
            <button class="side" onClick={() => store.setCategory('promo')}>Lihat semua <i class="fa-solid fa-chevron-right"></i></button>
          </div>
          <div class="rail">
            <For each={promos()}>{(p) => <ProductCard product={p} />}</For>
          </div>
        </section>
      </Show>

      <Show when={filtered()}>
        <section>
          <div class="section-head">
            <h2>
              <i class={`fa-solid ${catIcon(store.state.category)}`}></i>{' '}
              {store.state.query.trim() ? `Hasil: "${store.state.query.trim()}"` : catName(store.state.category)}
            </h2>
            <button class="side" onClick={() => { store.setQuery(''); store.setCategory('all') }}>
              Reset <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>
          <Show
            when={list().length > 0}
            fallback={
              <div class="empty3d">
                <div class="bubble"><i class="fa-solid fa-box-open"></i></div>
                <h3>Belum ada produk</h3>
                <p>Coba kata kunci lain atau pilih kategori berbeda.</p>
              </div>
            }
          >
            <div class="grid">
              <For each={list().slice(0, gridPg.display())}>{(p) => <ProductCard product={p} />}</For>
            </div>
            <Show when={gridPg.hasMore()}>
              <div class="lazy-hint">
                <div class="spinner" />
              </div>
              <gridPg.Sentinel />
            </Show>
          </Show>
        </section>
      </Show>

      <For each={filtered() ? [] : sections().slice(0, secPg.display())}>
        {(s) => (
          <section>
            <div class="section-head">
              <h2><i class={`fa-solid ${s.cat.icon}`}></i> {s.cat.name}</h2>
              <button class="side" onClick={() => store.setCategory(s.cat.id)}>Lihat semua <i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <div class="rail">
              <For each={s.items.slice(0, PRODUCTS_PER_SECTION)}>{(p) => <ProductCard product={p} />}</For>
            </div>
          </section>
        )}
      </For>

      <Show when={!filtered() && secPg.hasMore() && sections().length > CAT_RENDER_BATCH}>
        <div class="lazy-hint">
          <div class="spinner" />
        </div>
        <secPg.Sentinel />
      </Show>

      <Show when={store.state.products.length === 0}>
        <div class="empty3d">
          <div class="bubble"><i class="fa-solid fa-dolly"></i></div>
          <h3>Katalog sedang kosong</h3>
          <p>Sabarkan sejenak, stok sedang dirapikan.</p>
        </div>
      </Show>
    </>
  )
}
