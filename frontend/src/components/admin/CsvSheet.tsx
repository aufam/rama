import { Show, createSignal } from 'solid-js'
import { useStore } from '../../store-context'

/** Password + optional CSV file dialog for download/upload table ops. */
export default function CsvSheet() {
  const store = useStore()
  const mode = () => store.state.admin.csv // 'download' | 'upload' | null
  const open = () => mode() !== null
  const [pass, setPass] = createSignal('')
  const [file, setFile] = createSignal<File | null>(null)

  function close() {
    store.state.admin.csv = null
    setPass('')
    setFile(null)
  }

  async function submit(e: Event) {
    e.preventDefault()
    if (!pass().trim()) { store.toast('Password admin wajib diisi.', 'err'); return }
    if (mode() === 'upload' && !file()) { store.toast('Pilih file CSV terlebih dahulu.', 'err'); return }
    store.state.admin.csvBusy = true
    try {
      if (mode() === 'upload') {
        await store.uploadCsv(file()!, pass())
        store.toast('Data tabel diperbarui. Menyegarkan produk...')
        await store.loadProducts()
      } else {
        await store.downloadCsv(pass())
        store.toast('Unduhan dimulai.')
      }
      close()
    } catch (err) {
      store.toast(err instanceof Error && err.message.includes('401')
        ? 'Password salah atau sesi berakhir.'
        : 'Gagal memproses CSV.', 'err')
    } finally {
      store.state.admin.csvBusy = false
    }
  }

  return (
    <div class={`sheet ${open() ? 'on' : ''}`} aria-hidden={!open()}>
      <div class="sheet-card">
        <form onSubmit={submit}>
          <div class="sheet-grip" />
          <div class="sheet-top">
            <div>
              <h3>{mode() === 'upload' ? 'Unggah Data Tabel' : 'Unduh Data Tabel'}</h3>
              <p>{mode() === 'upload' ? 'Format CSV sesuai template database toko' : 'Berkas CSV seluruh tabel dikirim ke perangkatmu'}</p>
            </div>
            <button type="button" class="sheet-x" onClick={close} aria-label="Tutup">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="sheet-body">
            <div class="notice warn">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>
                <Show when={mode() === 'upload'} fallback="Data hanya untuk admin — jangan dibagikan.">
                  Unggah CSV akan <b>menimpa seluruh data produk</b>. Pastikan berkas sesuai template.
                </Show>
              </span>
            </div>

            <Show when={mode() === 'upload'}>
              <label class={`filebox ${file() ? 'chosen' : ''}`}>
                <i class="fa-solid fa-file-csv"></i>
                <span>
                  <b>{file() ? file()!.name : 'Pilih berkas CSV'}</b>
                  <span>{file() ? `${(file()!.size / 1024).toFixed(1)} KB — ketuk untuk ganti` : 'Format .csv maks 2 MB'}</span>
                </span>
                <input type="file" accept=".csv,text/csv" hidden onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
              </label>
            </Show>

            <div class="field">
              <label>Password Admin <em>*</em></label>
              <div class="inwrap">
                <i class="fa-solid fa-key"></i>
                <input class="in" type="password" placeholder="Password tabel" value={pass()} onInput={(e) => setPass(e.currentTarget.value)} />
              </div>
            </div>
          </div>

          <div class="sheet-foot">
            <button type="button" class="btn btn-ghost" onClick={close}>Batal</button>
            <button type="submit" class="btn btn-primary btn-flex" disabled={store.state.admin.csvBusy}>
              <i class={`fa-solid ${store.state.admin.csvBusy ? 'fa-circle-notch fa-spin' : mode() === 'upload' ? 'fa-upload' : 'fa-download'}`}></i>
              {store.state.admin.csvBusy ? 'Memproses...' : mode() === 'upload' ? 'Unggah CSV' : 'Unduh CSV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

