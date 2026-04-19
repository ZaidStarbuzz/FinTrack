import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TransactionFilters } from '../types'

interface AppState {
  // Filters
  transactionFilters: TransactionFilters
  setTransactionFilters: (filters: Partial<TransactionFilters>) => void
  resetFilters: () => void
  // UI state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  // Active account filter
  activeAccountId: string | null
  setActiveAccountId: (id: string | null) => void
  // Currency
  currency: string
  setCurrency: (c: string) => void
}

const defaultFilters: TransactionFilters = {
  datePreset: 'this_month',
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      transactionFilters: defaultFilters,
      setTransactionFilters: (filters) =>
        set((state) => ({ transactionFilters: { ...state.transactionFilters, ...filters } })),
      resetFilters: () => set({ transactionFilters: defaultFilters }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
      activeAccountId: null,
      setActiveAccountId: (id) => set({ activeAccountId: id }),
      currency: 'INR',
      setCurrency: (c) => set({ currency: c }),
    }),
    { name: 'fintrack-app-store', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, currency: s.currency }) }
  )
)
