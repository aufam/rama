import { Show } from 'solid-js'
import { useStore } from '../../store-context'
import { rupiah } from '../../types'
import ProdPhoto from './Prod'

export default function ProductCard(props: { product: import('../../types').Product; compact?: boolean }) {
  const store = useStore()
  const p = props.product
  const promo = () => store.isPromo(p)
  const price = () => store.effectivePrice(p)
  const soldOut = () => p.stock <= 0

  return (
    <article class="prod" classList={{ 'prod-card-promo': promo() }} onClick={() => store.openDetail(p)}>
      <div class="prod-photo" classList={{ ph: !p.image, 'prod-out': soldOut() }}>
        <ProdPhoto product={p} />
        <Show when={promo()}>
          <span class="prod-clip"><i class="fa-solid fa-fire"></i> Promo</span>
        </Show>
        <Show when={soldOut()}>
          <div class="prod-off"><span>Stok Habis</span></div>
        </Show>
        <Show when={!soldOut()}>
          <button
            class="prod-add"
            classList={{ hot: promo() }}
            aria-label={`Tambah ${p.name}`}
            onClick={(e) => {
              e.stopPropagation()
              store.addToCart(p, 1)
              store.toast(`+1 ${p.name}`)
            }}
          >
            <i class="fa-solid fa-plus"></i>
          </button>
        </Show>
      </div>
      <div class="prod-meta">
        <h4 class="prod-name">{p.name}</h4>
        <div class="prod-price">
          <Show when={promo()}><s>{rupiah(p.price)}</s></Show>
          <b>{rupiah(price())}</b>
          <span>/{p.unit || 'item'}</span>
        </div>
      </div>
    </article>
  )
}
