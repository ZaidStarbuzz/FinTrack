'use client'
import { useState } from 'react'
import { TransactionFilters, TransactionType } from '@/lib/types'
import { useAppStore } from '@/lib/stores/useAppStore'
import { Search, Filter, X, Calendar, SlidersHorizontal } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { useEffect } from 'react'

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'This Year', value: 'this_year' },
]

export function FilterBar() {
  const { transactionFilters, setTransactionFilters, resetFilters } = useAppStore()
  const [searchInput, setSearchInput] = useState(transactionFilters.search || '')
  const [debouncedSearch] = useDebounce(searchInput, 400)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setTransactionFilters({ search: debouncedSearch || undefined })
  }, [debouncedSearch])

  const toggleType = (t: TransactionType) => {
    const current = transactionFilters.types || []
    const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t]
    setTransactionFilters({ types: next.length ? next : undefined })
  }

  const hasActiveFilters = transactionFilters.types?.length || transactionFilters.categoryIds?.length ||
    transactionFilters.accountIds?.length || transactionFilters.amountMin || transactionFilters.amountMax ||
    (transactionFilters.datePreset && transactionFilters.datePreset !== 'this_month') || searchInput

  return (
    <div className="space-y-3">
      {/* Search + date presets */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setTransactionFilters({ datePreset: p.value as any, dateFrom: undefined, dateTo: undefined })}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${
                transactionFilters.datePreset === p.value
                  ? 'bg-primary text-white border-primary'
                  : 'hover:bg-muted border-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${showAdvanced ? 'bg-primary text-white border-primary' : 'hover:bg-muted'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => { resetFilters(); setSearchInput('') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
          {/* Type filters */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">TRANSACTION TYPE</p>
            <div className="flex gap-2">
              {(['income', 'expense', 'transfer'] as TransactionType[]).map(t => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize transition-colors ${
                    transactionFilters.types?.includes(t)
                      ? t === 'income' ? 'bg-green-500 text-white border-green-500'
                        : t === 'expense' ? 'bg-red-500 text-white border-red-500'
                        : 'bg-blue-500 text-white border-blue-500'
                      : 'hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount range */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">AMOUNT RANGE</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={transactionFilters.amountMin || ''}
                  onChange={e => setTransactionFilters({ amountMin: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <span className="text-muted-foreground">–</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={transactionFilters.amountMax || ''}
                  onChange={e => setTransactionFilters({ amountMax: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Custom date range */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">CUSTOM DATE RANGE</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={transactionFilters.dateFrom || ''}
                onChange={e => setTransactionFilters({ dateFrom: e.target.value, datePreset: 'custom' })}
                className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={transactionFilters.dateTo || ''}
                onChange={e => setTransactionFilters({ dateTo: e.target.value, datePreset: 'custom' })}
                className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
