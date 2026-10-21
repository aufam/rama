import { For, Show, createEffect, createSignal } from 'solid-js'
import JsBarcode from 'jsbarcode'
import { useStore } from '../../store-context'
import { STATUS_META, dateTimeFull, orderCount, orderTotal, rupiah } from '../../types'
import type { Order } from '../../types'

/** Full detail view for an order, opened from the admin orders tab. */
export default function OrderDetailSheet() {
  const store = useStore()
  const o = () => store.state.admin.details
  const open = () => o() !== null

  return (
    <div class={`sheet ${open() ? 'on' : ''}`} aria-hidden={!open()}>
      <div class="sheet-card">
        <Show when={o()}>
          {(order) => (
            <>
              <div class="sheet-grip" />
              <div class="sheet-top">
                <div>
                  <h3>Detail {order().id}</h3>
                  <p>{dateTimeFull(order().createdAt)}</p>
                </div>
                <button class="sheet-x" onClick={() => { store.patchAdmin({ details: null }) }} aria-label="Tutup">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div class="sheet-body">
                <div class="okd-head">
                  <div>
                    <span class="lbl" style="font-size:.64rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-faint);">Status Saat Ini</span>
                    <div class="oid" style="font-family:var(--font-display); font-size:1.2rem; font-weight:700;">
                      {statusOf(order().status).label}
                    </div>
                  </div>
                  <span class={`pill tone-${statusOf(order().status).tone}`}>
                    <i class={`fa-solid ${statusOf(order().status).icon}`}></i>
                  </span>
                </div>

                <div class="okd-status">
                  <div>
                    <b>{order().customer.name}</b><br />
                    {order().customer.phone}
                    <Show when={order().customer.id}> · Member {order().customer.id}</Show>
                  </div>
                </div>

                <div class="info-box">{order().customer.address || '—'}</div>
                <Show when={order().customer.notes}>
                  <div class="notice warn" style="background:var(--cream); border-color:var(--line); color:var(--ink-soft);">
                    <i class="fa-solid fa-comment-dots"></i>
                    <span>{order().customer.notes}</span>
                  </div>
                </Show>

                <div class="goods">
                  <For each={order().items}>
                    {(item) => <OrderItemRow item={item} />}
                  </For>
                  <div class="goods-total">
                    <b>Total ({orderCount(order())} barang)</b>
                    <span class="val">{rupiah(orderTotal(order()))}</span>
                  </div>
                </div>
              </div>

              <div class="sheet-foot">
                <a
                  class="btn btn-ghost btn-flex"
                  href={`https://wa.me/${order().customer.phone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${order().customer.name}, pesanan Anda ${order().id} sedang kami proses.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i class="fa-brands fa-whatsapp"></i> Hubungi
                </a>
                <button class="btn btn-primary btn-flex" onClick={() => { store.patchAdmin({ details: null }) }}>
                  Tutup
                </button>
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  )
}

function statusOf(status: string) {
  return STATUS_META[status] ?? STATUS_META.received
}

/** One ordered line: name + qty + optional barcode peeker. */
function OrderItemRow(props: { item: Order['items'][number] }) {
  const store = useStore()
  const barcode = () => store.productById(props.item.id)?.barcode || ''

  return (
    <div class="okd-item">
      <span>
        <span class="okd-item-head">
          <b>{props.item.name}</b>
          <Show when={barcode()}>
            <BarcodePeek code={barcode()} />
          </Show>
        </span>
        <span style="display:block; font-size:.7rem; color:var(--ink-soft);">
          barcode: {barcode()} * {props.item.quantity} {props.item.unit} x {rupiah(props.item.price)}
        </span>
        <Show when={props.item.notes}>
          <span style="display:block; font-size:.68rem; color:var(--red);">↳ {props.item.notes}</span>
        </Show>
      </span>
      <span style="font-weight:700; white-space:nowrap;">{rupiah(props.item.price * props.item.quantity)}</span>
    </div>
  )
}

/** Toggle button + lazily rendered EAN13 barcode (parity with vanilla admin.js). */
function BarcodePeek(props: { code: string }) {
  const [shown, setShown] = createSignal(false)
  let svg: SVGSVGElement | undefined

  createEffect(() => {
    if (!shown() || !svg) return
    try {
      const code = props.code.trim()
      const format = getRetailBarcodeFormat(code)

      JsBarcode(svg, code, {
        format,
        flat: true,
        width: 1.5,
        height: 45,
        fontSize: 12,
        margin: 5,
      })
    } catch (e) {
      console.warn('Gagal menggambar barcode:', e)
    }
  })

  return (
    <>
      <button
        type="button"
        class="okd-peek-btn"
        onClick={() => setShown((v) => !v)}
        title={shown() ? 'Sembunyikan barcode' : 'Tampilkan barcode'}
      >
        <i class={`fa-solid ${shown() ? 'fa-eye-slash' : 'fa-barcode'}`}></i> {shown() ? 'Hide barcode' : 'Show barcode'}
      </button>
      <Show when={shown()}>
        <div class="okd-barcode">
          <svg ref={svg} />
        </div>
      </Show>
    </>
  )
}

function getRetailBarcodeFormat(code: string): string {
  const value = code.trim()

  if (!/^\d+$/.test(value)) {
    return 'CODE128'
  }

  switch (value.length) {
    case 8:
      return 'EAN8'
    case 12:
      return 'UPC'
    case 13:
      return 'EAN13'
    case 6:
      return 'UPCE'
    case 7:
      // UPC-E may be supplied without its check digit.
      return 'UPCE'
    default:
      return 'CODE128'
  }
}
