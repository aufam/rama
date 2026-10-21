/* Entry point for the standalone tracking page (tracking.html). */
import { render } from 'solid-js/web'
import { StoreContext } from './store-context'
import { createAppStore } from './store'
import TrackingPage from './pages/TrackingPage'
import Toast from './components/ui/Toast'
import './index.css'

const store = createAppStore()
store.boot()

render(
  () => (
    <StoreContext.Provider value={store}>
      <TrackingPage />
      <Toast />
    </StoreContext.Provider>
  ),
  document.getElementById('root') as HTMLElement,
)
