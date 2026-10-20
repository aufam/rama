import { For, Show } from 'solid-js'
import { useStore } from '../store-context'
import { rupiah } from '../types'

export default function CartPage() {
  const store = useStore()

  return (
    <>
      <div class="pagehead">
        <h1>Keranjang</h1>
        <Show when={store.state.cart.length > 0}>
          <button class="side" onClick={store.clearCart}>
            <i class="fa-solid fa-trash-can"></i> Kosongkan
          </button>
        </Show>
      </div>

      <Show
        when={store.state.cart.length > 0}
        fallback={
          <div class="empty3d" style="padding-top:70px">
            <div class="bubble"><i class="fa-solid fa-basket-shopping"></i></div>
            <h3>Keranjang masih kosong</h3>
            <p>Yuk pilih produk dulu, nanti kita antar sampai depan rumah.</p>
            <button class="btn btn-primary" onClick={() => store.navigate('home')}>
              <i class="fa-solid fa-house"></i> Mulai Belanja
            </button>
          </div>
        }
      >
        <div class="cart-items">
          <For each={store.state.cart}>
            {(item, i) => (
              <div class="cart-row">
                <div class="cart-thumb">
                  <Show when={item.image} fallback={<i class="fa-solid fa-apple-whole"></i>}>
                    <img src={item.image} alt={item.name} loading="lazy" />
                  </Show>
                </div>
                <div class="cart-body">
                  <h4>{item.name}</h4>
                  <div class="sub">{rupiah(item.price)} / {item.unit || 'item'}</div>
                  <Show when={item.notes}>
                    <div class="note"><i class="fa-solid fa-note-sticky"></i> {item.notes}</div>
                  </Show>
                </div>
                <div class="cart-side">
                  <div class="step">
                    <button onClick={() => store.bumpItem(i(), -1)} aria-label="Kurangi">
                      <i class="fa-solid fa-minus"></i>
                    </button>
                    <b>{item.quantity}</b>
                    <button onClick={() => store.bumpItem(i(), 1)} aria-label="Tambah">
                      <i class="fa-solid fa-plus"></i>
                    </button>
                  </div>
                  <button class="cart-del" onClick={() => store.removeItem(i())} aria-label="Hapus item">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>

        <div style="flex: 1; min-height: 8px;"></div>

        <div class="cart-bar">
          <div class="cart-bar-sum">
            <span>Total belanja</span>
            <b>{rupiah(store.cartTotal())}</b>
          </div>
          <button class="btn btn-primary cart-bar-btn" onClick={store.openCheckout}>
            <i class="fa-brands fa-whatsapp"></i> Checkout
          </button>
        </div>
      </Show>
    </>
  )
}
