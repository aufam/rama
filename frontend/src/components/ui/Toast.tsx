import { Show } from 'solid-js'
import { useStore } from '../../store-context'

export default function Toast() {
  const store = useStore()
  const t = () => store.state.toast

  return (
    <Show when={t()}>
      <div class="toast" role="status">
        <div class={`toast-box ${t()!.kind}`}>
          <i class={`fa-solid ${t()!.kind === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {t()!.msg}
        </div>
      </div>
    </Show>
  )
}
