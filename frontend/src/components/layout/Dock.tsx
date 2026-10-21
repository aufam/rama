import { For, Show } from 'solid-js'
import { useStore } from '../../store-context'

const TABS = [
  { id: 'home', label: 'Beranda', icon: 'fa-house' },
  { id: 'cart', label: 'Keranjang', icon: 'fa-basket-shopping' },
  { id: 'history', label: 'Riwayat', icon: 'fa-clock-rotate-left' },
] as const

export default function Dock() {
  const store = useStore()

  return (
    <nav class="dock">
      <div class="dock-in">
        <For each={TABS}>
          {(t) => (
            <button
              class={`dock-btn ${store.state.view === t.id ? 'on' : ''}`}
              onClick={() => store.navigate(t.id)}
            >
              <i class={`fa-solid ${t.icon}`}>
                <Show when={t.id === 'cart' && store.cartCount() > 0}>
                  <span class="dot">{store.cartCount()}</span>
                </Show>
              </i>
              {t.label}
            </button>
          )}
        </For>
      </div>
    </nav>
  )
}
