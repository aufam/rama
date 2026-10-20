import { createContext, useContext } from 'solid-js'
import type { Store } from './store'

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used under <StoreContext.Provider>')
  return store
}
