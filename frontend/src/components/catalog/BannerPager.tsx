import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'

/** One auto-swiping banner pager (each slot is its own pager). */
export default function BannerPager(props: { images: string[] }) {
  const [idx, setIdx] = createSignal(0)
  let pager: HTMLDivElement | undefined
  let syncTimer: number | undefined

  onCleanup(() => {
    if (syncTimer !== undefined) clearTimeout(syncTimer)
  })

  /* follow idx (auto-advance or dot click) by scrolling the pager element */
  createEffect(() => {
    const i = idx()
    if (!pager) return
    const left = i * pager.clientWidth
    if (Math.abs(pager.scrollLeft - left) > 2) pager.scrollTo({ left, behavior: 'smooth' })
  })

  /* keep the index valid when the image list changes */
  createEffect(() => {
    if (idx() >= props.images.length) setIdx(0)
  })

  /* auto-swipe every 4.5s (vanilla parity) while the pager is on screen */
  onMount(() => {
    const timer = props.images.length > 1
      ? setInterval(() => {
          if (document.hidden) return
          setIdx((i) => (i + 1) % props.images.length)
        }, 4500)
      : null
    onCleanup(() => { if (timer) clearInterval(timer) })
  })

  /* keep dots in sync when the user swipes manually.
     Debounced: while a smooth programmatic scroll is running, scrollLeft is
     midway between slides, so snapping idx to that value mid-flight would
     cancel the animation (the bug that kept the carousel on slide 1). */
  function onScroll(): void {
    if (syncTimer !== undefined) clearTimeout(syncTimer)
    syncTimer = window.setTimeout(() => {
      syncTimer = undefined
      if (!pager) return
      const i = Math.round(pager.scrollLeft / pager.clientWidth)
      if (i !== idx() && i >= 0 && i < props.images.length) setIdx(i)
    }, 140)
  }

  return (
    <div class="pager" ref={pager} onScroll={onScroll}>
      <div class="pager-track">
        <For each={props.images}>
          {(src) => (
            <div class="pager-item">
              <img src={src} alt="Banner promo" loading="lazy" />
            </div>
          )}
        </For>
      </div>
      <Show when={props.images.length > 1}>
        <div class="dots">
          <For each={props.images}>
            {(_, i) => (
              <button
                classList={{ on: idx() === i() }}
                onClick={() => setIdx(i())}
                aria-label={`Banner ${i() + 1}`}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
