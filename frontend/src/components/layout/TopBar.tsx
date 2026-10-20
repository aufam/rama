import { Show } from 'solid-js'
import { useStore } from '../../store-context'
import { waLink } from '../../types'

export default function TopBar() {
  const store = useStore()
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'

  return (
    <header class="masthead">
      <div class="masthead-row">
        <div class="masthead-logo">
          <img src="/logo.jpg" alt="Rama Swalayan" />
        </div>
        <div>
          <div class="masthead-name">Rama Swalayan</div>
          <span class="masthead-sub"><i class="fa-brands fa-whatsapp"></i> Pesan cepat via WhatsApp</span>
        </div>
        <div class="masthead-actions">
          <a class="icon-pill" href={waLink(store.adminWa, 'Halo Rama Swalayan!')} target="_blank" rel="noreferrer" aria-label="WhatsApp">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
          <button class="icon-pill" onClick={() => store.navigate('cart')} aria-label="Keranjang">
            <i class="fa-solid fa-basket-shopping"></i>
            <Show when={store.cartCount() > 0}>
              <span class="dot">{store.cartCount()}</span>
            </Show>
          </button>
        </div>
      </div>
      <div class="greet">
        <h1>{greet}, mau belanja apa hari ini?</h1>
        <p>Ambil item favoritmu, semuanya siap diantar.</p>
      </div>
      <div class="searchwrap">
        <div class="searchbar">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Cari barang, makanan, sabun..."
            value={store.state.query}
            onInput={(e) => store.setQuery(e.currentTarget.value)}
          />
          <Show when={store.state.query}>
            <button class="search-clear" onClick={() => store.setQuery('')} aria-label="Hapus pencarian">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </Show>
        </div>
        <button class="icon-pill" onClick={store.openDrawer} aria-label="Semua kategori">
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>
    </header>
  )
}
