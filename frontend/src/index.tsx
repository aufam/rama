/* @refresh reload */
import { render } from 'solid-js/web'
import { StoreContext } from './store-context'
import { createAppStore } from './store'
import App from './App'
import './index.css'

const store = createAppStore()
store.boot()

render(
  () => (
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  ),
  document.getElementById('root') as HTMLElement,
)
