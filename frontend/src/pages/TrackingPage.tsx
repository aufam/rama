import { For, Show, createResource, createSignal } from 'solid-js'
import { useStore } from '../store-context'
import { STATUS_META, STATUS_ORDER, dateTimeICS, orderCount, orderTotal, pinUrl, rupiah, waLink, type Order, type OrderStatus } from '../types'

export default function TrackingPage() {
  const store = useStore()
  const [input, setInput] = createSignal(store.state.trackId || '')
  const [refreshing, setRefreshing] = createSignal(false)

  /* re-fetch whenever the routed order id changes */
  const [order, { refetch }] = createResource(
    () => store.state.trackId,
    async (id) => (id ? store.findOrder(id) : null),
  )

  async function refresh(): Promise<void> {
    if (refreshing()) return
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div class="track-page">
      <div class="track-bar">
        <div class="track-logo"><i class="fa-solid fa-truck-fast"></i></div>
        <div>
          <h1>Lacak <span>Pesanan</span></h1>
          <p>Pantau status pesanan secara real-time</p>
        </div>
        <div style="margin-left: auto; display: inline-flex; gap: 8px;">
          <button class="side" style="margin-left: 0;" onClick={() => void refresh()} aria-label="Segarkan status">
            <i class={`fa-solid ${refreshing() ? 'fa-rotate fa-spin' : 'fa-rotate'}`}></i>
          </button>
          <button class="side" style="margin-left: 0;" onClick={() => store.navigate('home')} aria-label="Beranda">
            <i class="fa-solid fa-house"></i>
          </button>
        </div>
      </div>

      <form
        class="track-lookup"
        onSubmit={(e) => {
          e.preventDefault()
          store.navigate('tracking', { id: input().trim() })
          refetch()
        }}
      >
        <input
          placeholder="No. pesanan, contoh: RAMA-123456"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value.toUpperCase())}
        />
        <button type="submit"><i class="fa-solid fa-magnifying-glass"></i> Cari</button>
      </form>

      <Show when={store.state.trackId} fallback={<LookupHint />}>
        <Show
          when={order()}
          fallback={
            <div class="empty3d">
              <div class="bubble"><i class="fa-solid fa-circle-question"></i></div>
              <h3>Pesanan tidak ditemukan</h3>
              <p>Periksa kembali nomor pesanan Anda. Nomor tercantum pada pesan WhatsApp konfirmasi.</p>
            </div>
          }
        >
          {(o) => <TrackingCard order={o()} onRefresh={refetch} />}
        </Show>
      </Show>
    </div>
  )
}

function LookupHint() {
  return (
    <div class="banner-note tone-blue">
      <i class="fa-solid fa-circle-info"></i>
      <span>
        Masukkan nomor pesanan yang Anda terima setelah memesan.
        Setiap perubahan status oleh admin toko akan tampil di sini.
      </span>
    </div>
  )
}

function TrackingCard(props: { order: Order; onRefresh: () => void }) {
  const store = useStore()
  const o = props.order
  const meta = () => STATUS_META[normalize(o.status)] ?? STATUS_META.received
  const activeIdx = () => Math.max(STATUS_ORDER.indexOf(normalize(o.status)), 0)
  const pin = store.readPin(o.customer.address)
  const detail = () => (o.customer.address || '').replace(/https?:\/\/\S+/i, '').trim()

  return (
    <div class="track-card">
      <div class="track-head">
        <div>
          <span class="lbl">Nomor Pesanan</span>
          <div class="oid">{o.id}</div>
          <div class="date">{dateTimeICS(o.createdAt)}</div>
        </div>
        <div class="right">
          <span class={`pill tone-${meta().tone}`}>
            <i class={`fa-solid ${meta().icon}`}></i> {meta().label}
          </span>
          <div class="up">Diperbarui {dateTimeICS(o.updatedAt)}</div>
        </div>
      </div>

      <div class="tl">
        <span class="tl-line"></span>
        <For each={STATUS_ORDER}>
          {(st, i) => (
            <div class="tl-step" classList={{ hit: i() === activeIdx(), past: i() < activeIdx() }}>
              <div class="tl-node"><i class={`fa-solid ${STATUS_META[st].icon}`}></i></div>
              <div class="tl-text">
                <b>{STATUS_META[st].label}</b>
                <p>{STATUS_META[st].desc}</p>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class={`banner-note tone-${meta().tone}`}>
        <i class={`fa-solid ${meta().icon}`}></i>
        <span>{meta().desc}</span>
      </div>

      <a
        class="btn btn-wa btn-flex"
        style="justify-content: center;"
        href={waLink(store.adminWa, `Halo Rama Swalayan, saya ingin menanyakan status pesanan saya dengan No. Pesanan ${o.id}`)}
        target="_blank"
        rel="noreferrer"
      >
        <i class="fa-brands fa-whatsapp"></i> Tanya Status via WhatsApp
      </a>

      <div>
        <div class="sect-title"><i class="fa-solid fa-boxes-stacking"></i> Daftar Barang</div>
        <div class="goods">
          <For each={o.items}>
            {(item) => (
              <div class="goods-row">
                <div>
                  <span class="t">{item.name}</span>
                  <span class="s">{item.quantity} {item.unit} x {rupiah(item.price)}</span>
                  <Show when={item.notes}><span class="n">↳ {item.notes}</span></Show>
                </div>
                <span class="p">{rupiah(item.price * item.quantity)}</span>
              </div>
            )}
          </For>
          <div class="goods-total">
            <b>Total ({orderCount(o)} barang)</b>
            <span class="val">{rupiah(orderTotal(o))}</span>
          </div>
        </div>
      </div>

      <div>
        <div class="sect-title"><i class="fa-solid fa-house-user"></i> Data Penerima</div>
        <div class="info-box">
          <b>{o.customer.name}</b> · {o.customer.phone}
          <Show when={o.customer.id}> · Member {o.customer.id}</Show>
          <br />
          <Show when={pin} fallback={<>{o.customer.address || '—'}</>}>
            <a href={pinUrl(pin!.lat, pin!.lng)} target="_blank" rel="noreferrer" style="color: var(--red); font-weight: 700;">
              <i class="fa-solid fa-map-location-dot"></i> Titik lokasi di Google Maps
            </a>
            <Show when={detail()}><br />{detail()}</Show>
          </Show>
          <Show when={o.customer.notes}>
            <br /><b>Catatan:</b> {o.customer.notes}
          </Show>
        </div>
      </div>
    </div>
  )
}

function normalize(status: string): OrderStatus {
  return (STATUS_ORDER as string[]).includes(status) ? (status as OrderStatus) : 'received'
}
