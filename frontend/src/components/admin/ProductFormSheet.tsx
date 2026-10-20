import { Show, createSignal } from 'solid-js'
import { useStore } from '../../store-context'
import { rupiah, type ProductDraft } from '../../types'

/** Bottom-sheet product editor; the draft lives in store.state.admin.form (reactive). */
export default function ProductFormSheet() {
  const store = useStore()
  const f = () => store.state.admin.form
  const open = () => f() !== null
  const [over, setOver] = createSignal(false)
  let file: HTMLInputElement | undefined

  function setField(key: keyof ProductDraft, value: string) {
    const draft = store.state.admin.form
    if (draft) (draft as unknown as Record<string, unknown>)[key as string] = value
  }

  async function upload(files: FileList | null) {
    const file = files?.[0]
    if (!file || !f()) return
    store.state.admin.imgBusy = true
    try {
      const url = await store.uploadImage(file)
      store.setImage(url)
      store.toast('Gambar terunggah.')
    } catch {
      store.toast('Gagal unggah gambar.', 'err')
    } finally {
      store.state.admin.imgBusy = false
    }
  }

  const preview = (): string => f()?.image || ''
  const estimated = (): number => {
    const d = f()
    if (!d) return 0
    const price = parseInt(d.price, 10) || 0
    const sale = parseInt(d.salePrice, 10) || 0
    if (sale > 0) return sale
    const disc = parseInt(d.discount, 10) || 0
    return disc > 0 ? Math.round(price * (1 - disc / 100)) : price
  }

  return (
    <div class={`sheet ${open() ? 'on' : ''}`} aria-hidden={!open()}>
      <div class="sheet-card">
        <Show when={f()}>
          {(draft) => (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void store.submitForm()
              }}
            >
              <div class="sheet-grip" />
              <div class="sheet-top">
                <div>
                  <h3>{draft().id ? 'Edit Produk' : 'Produk Baru'}</h3>
                  <p>Lengkapi detail agar pembeli mudah menemukannya</p>
                </div>
                <button type="button" class="sheet-x" onClick={store.closeForm} aria-label="Tutup">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div class="sheet-body">
                <div class="imgpick">
                  <div
                    class="dropzone"
                    classList={{ over: over(), busy: store.state.admin.imgBusy }}
                    onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer) void upload(e.dataTransfer.files) }}
                    onClick={() => file?.click()}
                    role="button"
                    tabindex="0"
                  >
                    <i class={`fa-solid ${store.state.admin.imgBusy ? 'fa-circle-notch fa-spin' : 'fa-cloud-arrow-up'}`}></i>
                    <b>{store.state.admin.imgBusy ? 'Mengunggah...' : 'Ketuk atau jatuhkan foto'}</b>
                    <span>JPG / PNG / WEBP — otomatis terunggah</span>
                    <input
                      ref={(el) => { file = el }}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void upload(e.currentTarget.files)}
                    />
                  </div>
                  <div class="preview">
                    <Show when={preview()}>
                      <img src={preview()} alt="Pratinjau" />
                      <button
                        type="button"
                        class="rm"
                        onClick={() => store.setImage('')}
                        aria-label="Hapus gambar"
                      >
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </Show>
                    <Show when={!preview()}>
                      <i class="fa-solid fa-image"></i>
                    </Show>
                  </div>
                </div>

                <div class="form-grid">
                  <div class="field">
                    <label>Kode Produk <em>*</em></label>
                    <div class="inwrap">
                      <i class="fa-solid fa-tag"></i>
                      <input class="in" placeholder="prod-15" value={draft().id} onInput={(e) => setField('id', e.currentTarget.value)} />
                    </div>
                  </div>
                  <div class="field">
                    <label>Kategori</label>
                    <div class="inwrap">
                      <i class="fa-solid fa-layer-group"></i>
                      <select
                        class="in"
                        style="border:none; outline:none; background:transparent; width:100%; font-size:.85rem; font-weight:500;"
                        value={draft().category}
                        onChange={(e) => setField('category', e.currentTarget.value)}
                      >
                        <ForCategories />
                      </select>
                    </div>
                  </div>
                  <div class="field wide">
                    <label>Nama Produk <em>*</em></label>
                    <div class="inwrap">
                      <i class="fa-solid fa-basket-shopping"></i>
                      <input class="in" placeholder="Contoh: Air Mineral 600ml" value={draft().name} onInput={(e) => setField('name', e.currentTarget.value)} />
                    </div>
                  </div>
                  <div class="field">
                    <label>Harga (Rp) <em>*</em></label>
                    <div class="inwrap">
                      <i class="fa-solid fa-rupiah-sign"></i>
                      <input class="in" type="number" min="0" placeholder="0" value={draft().price} onInput={(e) => setField('price', e.currentTarget.value)} />
                    </div>
                  </div>
                  <div class="field">
                    <label>Satuan</label>
                    <div class="inwrap">
                      <i class="fa-solid fa-scale-balanced"></i>
                      <input class="in" placeholder="botol / kg / item" value={draft().unit} onInput={(e) => setField('unit', e.currentTarget.value)} />
                    </div>
                  </div>
                  <div class="field">
                    <label>Diskon (%)</label>
                    <div class="inwrap">
                      <i class="fa-solid fa-percent"></i>
                      <input class="in" type="number" min="0" max="99" placeholder="0" value={draft().discount} onInput={(e) => setField('discount', e.currentTarget.value)} />
                    </div>
                  </div>
                  <div class="field">
                    <label>Harga Promo (Rp)</label>
                    <div class="inwrap">
                      <i class="fa-solid fa-fire"></i>
                      <input class="in" type="number" min="0" placeholder="Otomatis dari diskon" value={draft().salePrice} onInput={(e) => setField('salePrice', e.currentTarget.value)} />
                    </div>
                  </div>
                </div>

                <Show when={estimated() > 0 && (parseInt(draft().discount, 10) > 0 || parseInt(draft().salePrice, 10) > 0)}>
                  <div class="ok-badge tone-green" style="align-self:flex-start;">
                    <i class="fa-solid fa-fire"></i> Harga final: {rupiah(estimated())}
                  </div>
                </Show>

                <div class="field">
                  <label>Deskripsi</label>
                  <div class="inwrap">
                    <i class="fa-solid fa-align-left"></i>
                    <textarea rows="2" placeholder="Ceritakan keunggulan produk..." value={draft().description} onInput={(e) => setField('description', e.currentTarget.value)}></textarea>
                  </div>
                </div>
              </div>

              <div class="sheet-foot">
                <button type="button" class="btn btn-ghost" onClick={store.closeForm}>Batal</button>
                <button type="submit" class="btn btn-primary btn-flex" disabled={store.state.admin.formBusy}>
                  <i class={`fa-solid ${store.state.admin.formBusy ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`}></i>
                  {store.state.admin.formBusy ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          )}
        </Show>
      </div>
    </div>
  )
}

/* helper components ------------------------------------------------ */

function ForCategories() {
  const store = useStore()
  return (
    <>
      {store.state.categories
        .filter((c) => c.id !== 'all')
        .map((c) => (
          <option value={c.id}>{c.name}</option>
        ))}
    </>
  )
}
