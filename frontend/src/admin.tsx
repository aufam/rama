/* Entry point for the standalone admin page (admin.html). */
import { render } from 'solid-js/web'
import { StoreContext } from './store-context'
import { createAppStore } from './store'
import AdminPage from './pages/AdminPage'
import Toast from './components/ui/Toast'
import './index.css'

const store = createAppStore()
store.boot()

render(
  () => (
    <StoreContext.Provider value={store}>
      <AdminPage />
      <Toast />
    </StoreContext.Provider>
  ),
  document.getElementById('root') as HTMLElement,
)
