import { For, Show, createMemo } from 'solid-js'
import { useStore } from '../store-context'
import { STATUS_META, dateTimeICS, rupiah, type Order } from '../types'

export default function HistoryPage() {
  const store = useStore()

  const orders = createMemo(() => {
    const byId = new Map<string, Order>()
    for (const o of [...store.state.history, ...store.state.orders.filter((o) => o.customer.phone)]) {
      if (o?.id && !byId.has(o.id)) byId.set(o.id, o)
    }
    return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  })

  const pill = (status: string) => STATUS_META[status] ?? STATUS_META.received

  return (
    <>
      <div class="pagehead">
        <h1>Riwayat Pesanan</h1>
        <span class="side" style="color: var(--ink-faint);">
          {orders().length} pesanan
        </span>
      </div>

      <Show
        when={orders().length > 0}
        fallback={
          <div class="empty3d" style="padding-top:70px">
            <div class="bubble"><i class="fa-solid fa-clock-rotate-left"></i></div>
            <h3>Belum ada pesanan</h3>
            <p>Setelah pesan pertama berhasil dikirim, riwayatnya muncul di sini.</p>
            <button class="btn btn-primary" onClick={() => store.navigate('home')}>
              <i class="fa-solid fa-house"></i> Mulai Belanja
            </button>
          </div>
        }
      >
        <div class="h-list">
          <For each={orders()}>
            {(o) => (
              <div class="hist">
                <div class="hist-top">
                  <div>
                    <b>{o.id}</b>
                    <span class="date">{dateTimeICS(o.createdAt)}</span>
                  </div>
                  <span class={`pill tone-${pill(o.status).tone}`}>
                    <i class={`fa-solid ${pill(o.status).icon}`}></i> {pill(o.status).label}
                  </span>
                </div>
                <div class="hist-meta">
                  <span>{o.totalCount} barang</span>
                  <b>{rupiah(o.totalPrice)}</b>
                </div>
                <button class="hist-track" onClick={() => store.navigate('tracking', { id: o.id })}>
                  <i class="fa-solid fa-route"></i> Lacak Pesanan
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  )
}
