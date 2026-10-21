import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import type { JSX } from 'solid-js'

/**
 * Progressive (lazy) rendering — vanilla parity with kiosk.js/admin.js:
 * a plain scroll listener on the actual scroll container. When it gets
 * within ~280px of the bottom, render one more batch. No IntersectionObserver.
 */
function scrollParent(node: HTMLElement): HTMLElement {
  let el: HTMLElement | null = node.parentElement
  while (el) {
    const o = getComputedStyle(el).overflowY
    if (o === 'auto' || o === 'scroll') return el
    el = el.parentElement
  }
  return document.documentElement
}

export function progressive(total: () => number, batch: number, resetKey?: () => unknown) {
  const [shown, setShown] = createSignal(batch)

  /* filter change restarts from the first batch */
  if (resetKey) {
    createEffect(() => {
      void resetKey()
      setShown(batch)
    })
  }

  const display = createMemo(() => Math.min(shown(), total()))
  const hasMore = () => display() < total()

  let container: HTMLElement | undefined
  let busy = false

  function nearBottom(): boolean {
    if (!container) return false
    return container.scrollTop + container.clientHeight >= container.scrollHeight - 280
  }

  /* one batch per scroll pass near the bottom */
  function maybeExpand(): void {
    if (busy || !container || !hasMore() || !nearBottom()) return
    busy = true
    setShown((n) => n + batch)
    /* one wash cycle: if the list still doesn't fill the page, keep going on the next tick */
    requestAnimationFrame(() => {
      busy = false
      maybeExpand()
    })
  }

  const attach = (el: HTMLElement): void => {
    const target = scrollParent(el)
    container = target
    const host: HTMLElement | Window = target === document.documentElement ? window : target
    host.addEventListener('scroll', maybeExpand, { passive: true })
    onCleanup(() => host.removeEventListener('scroll', maybeExpand))
    maybeExpand()
  }

  /* data arriving late (list was empty at mount) can also be fillable */
  createEffect(() => {
    hasMore()
    maybeExpand()
  })

  const Sentinel = (): JSX.Element => <div ref={attach} style="height: 1px;" aria-hidden="true" />

  return { display, hasMore, Sentinel }
}
