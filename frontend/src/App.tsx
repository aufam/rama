import { onCleanup, onMount } from 'solid-js'
import { useStore } from './store-context'
import TopBar from './components/layout/TopBar'
import Drawer from './components/layout/Drawer'
import Dock from './components/layout/Dock'
import ProductSheet from './components/catalog/ProductSheet'
import CheckoutSheet from './components/checkout/CheckoutSheet'
import HomePage from './pages/HomePage'
import CartPage from './pages/CartPage'
import HistoryPage from './pages/HistoryPage'
import TrackingPage from './pages/TrackingPage'
import AdminPage from './pages/AdminPage'
import Toast from './components/ui/Toast'

export default function App() {
    const store = useStore()

    onMount(() => {
        window.addEventListener('popstate', store.handlePopState)
        onCleanup(() => window.removeEventListener('popstate', store.handlePopState))
    })

    return (
        <>
            {store.state.view === 'tracking' ? (
                <TrackingPage />
            ) : store.state.view === 'admin' ? (
                <AdminPage />
            ) : (
                <div class="screen">
                    <TopBar />
                    <main class="content">
                        {store.state.view === 'home' && <HomePage />}
                        {store.state.view === 'cart' && <CartPage />}
                        {store.state.view === 'history' && <HistoryPage />}
                    </main>
                    <Drawer />
                    <Dock />
                </div>
            )}

            {/* global overlays */}
            <ProductSheet />
            <CheckoutSheet />
            <Toast />
        </>
    )
}
