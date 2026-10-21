import { createSignal, onMount } from 'solid-js'
import { useStore } from '../../store-context'
import { readGps } from '../../types'

interface LMap {
  getCenter(): { lat: number; lng: number }
  setView(center: [number, number], zoom?: number): void
  invalidateSize(): void
  off(type: string, fn: () => void): void
  remove(): void
}

const DEFAULT_POS = { lat: -6.5281558, lng: 110.7236172 }

/** Full-screen map picker; the fixed pin is at the container's center. */
export default function MapSheet(props: {
  initial: { lat: number; lng: number } | null
  onConfirm: (c: { lat: number; lng: number }) => void
  onClose: () => void
}) {
  const store = useStore()
  const [pos, setPos] = createSignal(props.initial || DEFAULT_POS)
  const [locating, setLocating] = createSignal(false)
  let holder: HTMLDivElement | undefined
  let map: LMap | null = null
  let onMove = () => { }

  onMount(() => {
    waitLeaflet(() => {
      const L = (window as unknown as { L: any }).L
      if (!holder || !L) return
      const m = L.map(holder).setView([pos().lat, pos().lng], 16)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(m)
      onMove = () => {
        const c = m.getCenter()
        setPos({ lat: c.lat, lng: c.lng })
      }
      m.on('move', onMove)
      map = m
      setTimeout(() => m.invalidateSize(), 120)
      /* opened without a saved pin — jump straight to the device's current position */
      if (!props.initial) void locateMe()
    })
  })

  /** Re-read the device GPS and recenter the pin on it. */
  async function locateMe(): Promise<void> {
    if (locating()) return
    setLocating(true)
    try {
      const c = await readGps()
      setPos(c)
      map?.setView([c.lat, c.lng], 17)
    } catch {
      store.toast('Lokasi GPS tidak dapat dideteksi.', 'err')
    } finally {
      setLocating(false)
    }
  }

  function dispose() {
    if (map) { map.off('move', onMove); map.remove?.() }
    map = null
  }

  return (
    <div class="sheet on" style="z-index:90;">
      <div class="sheet-card" style="height: 88dvh;">
        <div class="sheet-grip" />
        <div class="sheet-top">
          <div>
            <h3>Pilih Titik Lokasi</h3>
            <p>Geser peta hingga pin berada tepat di depan rumah Anda</p>
          </div>
          <button class="sheet-x" onClick={() => { dispose(); props.onClose() }} aria-label="Tutup">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="map-card">
          <div class="map-holder" ref={holder}></div>
          <i class="fa-solid fa-location-dot map-pin"></i>
          <span class="map-chip">{pos().lat.toFixed(6)}, {pos().lng.toFixed(6)}</span>
        </div>
        <div class="sheet-foot">
          <button class="btn btn-ghost" onClick={() => { dispose(); props.onClose() }}>Batal</button>
          <button
            class="btn btn-ghost"
            disabled={locating()}
            title="Kembalikan pin ke lokasi GPS Anda saat ini"
            onClick={() => void locateMe()}
          >
            <i class={`fa-solid ${locating() ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'}`}></i>
            {locating() ? 'Mencari GPS...' : 'Lokasi Saya'}
          </button>
          <button class="btn btn-primary btn-flex" onClick={() => { const c = pos(); dispose(); props.onConfirm(c) }}>
            <i class="fa-solid fa-check"></i> Gunakan Titik Ini
          </button>
        </div>
      </div>
    </div>
  )
}

function waitLeaflet(cb: () => void): void {
  if ((window as unknown as { L?: unknown }).L) return cb()
  let tries = 0
  const t = setInterval(() => {
    if ((window as unknown as { L?: unknown }).L || tries++ > 50) {
      clearInterval(t)
      if ((window as unknown as { L?: unknown }).L) cb()
    }
  }, 120)
}
