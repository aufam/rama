import { For, Show, createEffect, onCleanup, onMount, createSignal, createUniqueId } from 'solid-js'

/** One auto-swiping banner pager (each slot is its own pager). */
export default function BannerPager(props: { images: string[] }) {
  const [idx, setIdx] = createSignal(0)
  const uid = createUniqueId()
  let holder: HTMLDivElement | undefined

  /* follow idx (auto-advance or dot click) by scrolling the track */
  createEffect(() => {
    const i = idx()
    const el = holder
    if (!el) return
    const slide = el.querySelector<HTMLElement>(`[data-uid="${uid}-${i}"]`)
    if (slide) el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' })
  })

  /* keep the index valid when the image list changes */
  createEffect(() => {
    if (idx() >= props.images.length) setIdx(0)
  })

  onMount(() => {
    const t = setInterval(() => {
      if (props.images.length > 1) setIdx((i) => (i + 1) % props.images.length)
    }, 4500)
    onCleanup(() => clearInterval(t))
  })

  return (
    <div class="pager">
      <div class="pager-track" ref={holder}>
        <For each={props.images}>
          {(src, i) => (
            <div class="pager-item" data-uid={`${uid}-${i()}`}>
              <img src={src} alt="Banner promo" loading="lazy" />
            </div>
          )}
        </For>
      </div>
      <Show when={props.images.length > 1}>
        <div class="dots">
          <For each={props.images}>
            {(_, i) => <button classList={{ on: idx() === i() }} onClick={() => setIdx(i())} aria-label={`Banner ${i() + 1}`} />}
          </For>
        </div>
      </Show>
    </div>
  )
}
