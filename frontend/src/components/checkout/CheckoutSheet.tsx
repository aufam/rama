import { Show, createEffect, createSignal } from 'solid-js'
import { useStore } from '../../store-context'
import { orderMessage, pinUrl, readGps, readPin, waLink } from '../../types'
import type { CustomerInfo, Order } from '../../types'
import MapSheet from './MapSheet'

export default function CheckoutSheet() {
  const store = useStore()
  const open = () => store.state.checkout
  const done = () => store.state.done
  /* form state — seeded from saved customer data (if any) */
  const saved = store.state.customer
  const savedPin = saved ? readPin(saved.address) : null
  const savedDetail = saved
    ? saved.address.replace(/https?:\/\/\S+/i, '').replace(/^[\s,\n-]+/, '')
    : ''

  const [name, setName] = createSignal(saved?.name || '')
  const [phone, setPhone] = createSignal(saved?.phone || '')
  /* "No. Member" is optional in the form; it maps to CustomerInfo.id
     (legacy localStorage entries only had a .member field — tolerate those) */
  const legacy = saved ? ((saved as unknown as { member?: string }).member || '') : ''
  const [member, setMember] = createSignal(saved?.id || legacy)
  const [detail, setDetail] = createSignal(savedDetail)
  const [notes, setNotes] = createSignal(saved?.notes || '')
  const [pin, setPin] = createSignal<{ lat: number; lng: number } | null>(savedPin)
  const [mapOpen, setMapOpen] = createSignal(false)
  const [sending, setSending] = createSignal(false)
  const [gpsBusy, setGpsBusy] = createSignal(false)

  /* without a saved pin, default the map point to the device's current GPS position
     the first time the checkout sheet opens (browser shows permission prompt) */
  let gpsTried = false
  createEffect(() => {
    if (!store.state.checkout || gpsTried || pin()) return
    gpsTried = true
    setGpsBusy(true)
    readGps()
      .then((c) => setPin(c))
      .catch(() => store.toast('Lokasi GPS tidak dapat dideteksi — pilih titik di peta.', 'err'))
      .finally(() => setGpsBusy(false))
  })

  const info = (): CustomerInfo => ({
    /* backend requires this field — an empty member no. stays an empty string */
    id: member().trim(),
    name: name().trim(),
    phone: phone().trim(),
    address: address(),
    notes: notes().trim(),
  })

  function address(): string {
    const parts: string[] = []
    if (pin()) parts.push(pinUrl(pin()!.lat, pin()!.lng))
    if (detail().trim()) parts.push(detail().trim())
    return parts.join('\n')
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!name().trim() || !phone().trim()) { store.toast('Nama & No. WhatsApp wajib diisi.', 'err'); return }
    if (!pin()) { store.toast('Titik lokasi peta wajib dipilih.', 'err'); setMapOpen(true); return }
    if (!store.state.cart.length) { store.toast('Keranjang masih kosong.', 'err'); return }

    setSending(true)
    let order: Order
    try {
      order = await store.createOrder(info(), store.state.cart)
    } catch {
      setSending(false)
      store.toast('Gagal mengirim pesanan — periksa koneksi internet Anda.', 'err')
      return
    }
    setSending(false)

    store.saveCustomer(info())
    store.addToHistory(order)
    store.toast('Pesanan berhasil dikirim!')
    store.clearCart()
    store.finish(order)
    window.open(waLink(store.adminWa, orderMessage(info(), order.items, order.id)), '_blank')
  }

  return (
    <div class={`sheet ${open() ? 'on' : ''}`} aria-hidden={!open()}>
      <div class="sheet-card" style="max-height: 94dvh;">
        <div class="sheet-grip" />
        <div class="sheet-top">
          <div>
            <h3>{done() ? 'Pesanan Terkirim!' : 'Kirim Pesanan via WhatsApp'}</h3>
            <p>{done() ? 'Pantau status pesanan kapan saja.' : 'Data dikirim ke admin untuk konfirmasi.'}</p>
          </div>
          <button class="sheet-x" onClick={store.closeCheckout} aria-label="Tutup">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <Show when={!done()}>
          <form onSubmit={submit}>
            <div class="sheet-body">
              <div class="form-grid">
                <div class="field">
                  <label>Nama <em>*</em></label>
                  <div class="inwrap"><i class="fa-solid fa-user"></i>
                    <input class="in" placeholder="Nama Anda" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
                  </div>
                </div>
                <div class="field">
                  <label>No. WhatsApp <em>*</em></label>
                  <div class="inwrap"><i class="fa-brands fa-whatsapp"></i>
                    <input class="in" type="tel" placeholder="08xxxxxxxxxx" value={phone()} onInput={(e) => setPhone(e.currentTarget.value)} />
                  </div>
                </div>
                <div class="field wide">
                  <label>No. Member</label>
                  <div class="inwrap"><i class="fa-solid fa-id-card"></i>
                    <input class="in" type="tel" placeholder="Opsional" value={member()} onInput={(e) => setMember(e.currentTarget.value)} />
                  </div>
                </div>
              </div>

              <div class="field">
                <label>Titik lokasi peta <em>*</em></label>
                <button type="button" class={`pinbox ${pin() ? 'ok' : 'warn'}`} onClick={() => setMapOpen(true)}>
                  <i class={`fa-solid ${gpsBusy() ? 'fa-circle-notch fa-spin' : pin() ? 'fa-circle-check' : 'fa-map-location-dot'}`}></i>
                  <span>
                    {gpsBusy()
                      ? 'Mendeteksi lokasi GPS Anda...'
                      : pin()
                        ? `Titik peta terpasang (${pin()!.lat.toFixed(5)}, ${pin()!.lng.toFixed(5)})`
                        : 'Belum ditentukan — ketuk untuk pilih lokasi'}
                    <small>{gpsBusy() ? 'Menggunakan posisi perangkat Anda' : pin() ? 'Ketuk untuk mengubah' : 'Agar kurir mudah menemukan rumah Anda'}</small>
                  </span>
                </button>
              </div>

              <div class="field">
                <label>Detail alamat</label>
                <div class="inwrap">
                  <i class="fa-solid fa-house-flag"></i>
                  <textarea rows="2" placeholder="No. rumah, RT/RW, patokan, warna pagar..." value={detail()} onInput={(e) => setDetail(e.currentTarget.value)}></textarea>
                </div>
              </div>

              <div class="field">
                <label>Catatan untuk toko</label>
                <div class="inwrap"><i class="fa-solid fa-comment-dots"></i>
                  <input class="in" placeholder="Tolong bungkus terpisah, dsb." value={notes()} onInput={(e) => setNotes(e.currentTarget.value)} />
                </div>
              </div>

              <div>
                <div class="field"><label>Ringkasan pesanan</label></div>
                <div class="order-peek">{orderMessage(info(), store.state.cart, null)}</div>
              </div>
            </div>
            <div class="sheet-foot">
              <button type="button" class="btn btn-ghost" onClick={store.closeCheckout}>Batal</button>
              <button type="submit" class="btn btn-wa btn-flex" disabled={sending()}>
                <i class={`fa-brands ${sending() ? 'fa-circle-notch fa-spin' : 'fa-whatsapp'}`}></i>
                {sending() ? 'Mengirim...' : 'Kirim ke WhatsApp'}
              </button>
            </div>
          </form>
        </Show>

        <Show when={done()}>
          <div class="sheet-body">
            <div class="win">
              <div class="seal"><i class="fa-solid fa-circle-check"></i></div>
              <h3>Pesanan berhasil dikirim!</h3>
              <p>Simpan nomor pesanan untuk memantau status pesanan Anda secara langsung.</p>
              <span class="oid"><i class="fa-solid fa-receipt"></i> {done()?.id}</span>
            </div>
          </div>
          <div class="sheet-foot">
            <button type="button" class="btn btn-ghost" onClick={store.closeCheckout}>Tutup</button>
            <button type="button" class="btn btn-red btn-flex" onClick={() => { const id = done()?.id || ''; store.navigate('tracking', { id }) }}>
              <i class="fa-solid fa-route"></i> Pantau Pesanan
            </button>
          </div>
        </Show>
      </div>

      <Show when={mapOpen()}>
        <MapSheet
          initial={pin()}
          onConfirm={(c) => { setPin(c); setMapOpen(false) }}
          onClose={() => setMapOpen(false)}
        />
      </Show>
    </div>
  )
}
