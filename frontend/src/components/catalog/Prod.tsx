import { Show } from 'solid-js'
import type { Product } from '../../types'

/** Product photo (or icon fallback) sized by aspect-ratio of its wrapper. */
export default function ProdPhoto(props: { product: Product }) {
  return (
    <Show
      when={props.product.image}
      fallback={<i class="fa-solid fa-apple-whole" aria-hidden="true"></i>}
    >
      <img src={props.product.image} alt={props.product.name} loading="lazy" />
    </Show>
  )
}
