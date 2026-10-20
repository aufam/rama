import { Show, createEffect, createSignal } from 'solid-js'
import { useStore } from '../../store-context'
import { rupiah } from '../../types'

export default function ProductSheet() {
  const store = useStore()
  const open = () => store.state.detail !== null
  const p = () => store.state.detail!
  const promo = () => store.isPromo(p())
  const price = () => store.effectivePrice(p())

  const [qty, setQty] = createSignal(1)
  let notes: HTMLInputElement | undefined

  /* reset whenever a new product opens */
  createEffect(() => {
    if (store.state.detail) {
      setQty(1)
      if (notes) notes.value = ''
    }
  })

  return (
    <div class={`sheet ${open() ? 'on' : ''}`} aria-hidden={!open()}>
      <div class="sheet-card">
        <Show when={store.state.detail !== null && p()}>
          <>
            <div class="sheet-grip" />
            <div class="sheet-top">
              <div>
                <h3>Tambah ke Keranjang</h3>
                <p>Atur jumlah & catatan khusus untuk item ini</p>
              </div>
              <button class="sheet-x" onClick={store.closeDetail} aria-label="Tutup">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="sheet-body">
              <div class="p-detail" classList={{ hot: promo() }}>
                <div class="p-photo">
                  <Show when={!p().image}>
                    <i class="fa-solid fa-apple-whole"></i>
                  </Show>
                  <Show when={p().image}>
                    <img src={p().image} alt={p().name} />
                  </Show>
                </div>
                <div>
                  <h4>{p().name}</h4>
                  <div class="prices">
                    <Show when={promo()}>
                      <s>{rupiah(p().price)}</s>
                    </Show>
                    <b>{rupiah(price())}</b>
                    <small>/{p().unit || 'item'}</small>
                  </div>
                  <p>{p().description || 'Belum ada deskripsi produk.'}</p>
                </div>
              </div>

              <div class="field">
                <label>Jumlah</label>
                <div style="display:flex; align-items:center; gap:12px;">
                  <div class="step">
                    <button onClick={() => setQty((n) => Math.max(1, n - 1))} disabled={qty() <= 1} aria-label="Kurangi">
                      <i class="fa-solid fa-minus"></i>
                    </button>
                    <b>{qty()}</b>
                    <button onClick={() => setQty((n) => n + 1)} aria-label="Tambah">
                      <i class="fa-solid fa-plus"></i>
                    </button>
                  </div>
                  <span style="font-weight:700; color:var(--brand-800);">
                    {rupiah(price() * qty())} <small style="color:var(--ink-faint); font-weight:500;">total</small>
                  </span>
                </div>
              </div>

              <div class="field">
                <label>Catatan untuk item <em>opsional</em></label>
                <div class="inwrap">
                  <i class="fa-solid fa-note-sticky"></i>
                  <input
                    ref={notes}
                    class="in"
                    placeholder="Contoh: yang matang, yang tanpa gula..."
                    onKeyDown={(e) => { if (e.key === 'Enter') addNow() }}
                  />
                </div>
              </div>
            </div>

            <div class="sheet-foot">
              <button class="btn btn-ghost" onClick={store.closeDetail}>Batal</button>
              <button class="btn btn-primary btn-flex" onClick={addNow}>
                <i class="fa-solid fa-cart-plus"></i> Masukkan Keranjang
              </button>
            </div>
          </>
        </Show>
      </div>
    </div>
  )

  function addNow() {
    const product = p()
    store.addToCart(product, qty(), notes?.value || '')
    store.closeDetail()
    store.toast(`${qty()} x ${product.name} masuk keranjang`)
  }
}
