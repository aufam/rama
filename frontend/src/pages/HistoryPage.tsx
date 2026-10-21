import { For, Show, createMemo, createSignal } from 'solid-js'
import { useStore } from '../store-context'
import { STATUS_META, dateTimeICS, orderCount, orderTotal, rupiah, type Order } from '../types'

export default function HistoryPage() {
  const store = useStore()
  const [refreshing, setRefreshing] = createSignal(false)

  async function refresh(): Promise<void> {
    if (refreshing()) return
    setRefreshing(true)
    try {
      const n = await store.refreshMyOrders()
      store.toast(n > 0 ? `Status ${n} pesanan diperbarui.` : 'Status pesanan sudah terbaru.')
    } catch {
      store.toast('Gagal menyegarkan status pesanan.', 'err')
    } finally {
      setRefreshing(false)
    }
  }

  const orders = createMemo(() => {
    /* orders actually placed from this device: local history + matching server orders */
    const mine = store.state.customer?.phone?.replace(/\D/g, '') || ''
    const byId = new Map<string, Order>()
    for (const o of [...store.state.history, ...store.state.orders]) {
      if (!o?.id) continue
      const phone = (o.customer?.phone || '').replace(/\D/g, '')
      if (phone && mine && phone !== mine) continue
      if (!byId.has(o.id)) byId.set(o.id, o)
    }
    return [...byId.values()]
      .filter((o) => (o.items || []).length > 0)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  })

  const pill = (status: string) => STATUS_META[status] ?? STATUS_META.received

  return (
    <>
      <div class="pagehead">
        <h1>Riwayat Pesanan</h1>
        <div class="side" style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="color: var(--ink-faint); margin-left: 0;">{orders().length} pesanan</span>
          <Show when={orders().length > 0}>
            <button class="side" style="margin-left: 0;" onClick={() => void refresh()} aria-label="Segarkan status">
              <i class={`fa-solid ${refreshing() ? 'fa-rotate fa-spin' : 'fa-rotate'}`}></i> Segarkan
            </button>
          </Show>
        </div>
      </div>

      <Show
        when={orders().length > 0}
        fallback={
          <div class="empty3d" style="padding-top: 70px">
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
                  <span>{orderCount(o)} barang</span>
                  <b>{rupiah(orderTotal(o))}</b>
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
