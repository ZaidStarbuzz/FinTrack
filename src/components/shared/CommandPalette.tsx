'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/stores/useAppStore'
import { Search, LayoutDashboard, ArrowLeftRight, CreditCard, Target, Coins, TrendingUp, BarChart3, Settings, Wallet, BadgeDollarSign } from 'lucide-react'

const commands = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Navigate' },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight, group: 'Navigate' },
  { label: 'Accounts', href: '/accounts', icon: CreditCard, group: 'Navigate' },
  { label: 'Budgets', href: '/budgets', icon: Wallet, group: 'Navigate' },
  { label: 'Goals', href: '/goals', icon: Target, group: 'Navigate' },
  { label: 'Chit Funds', href: '/chit-funds', icon: Coins, group: 'Navigate' },
  { label: 'Loans & EMI', href: '/loans', icon: BadgeDollarSign, group: 'Navigate' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, group: 'Navigate' },
  { label: 'Net Worth', href: '/net-worth', icon: TrendingUp, group: 'Navigate' },
  { label: 'Settings', href: '/settings', icon: Settings, group: 'Navigate' },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  if (!commandPaletteOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/80 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)}>
      <div className="w-full max-w-lg bg-card border rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages and actions..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded border">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map(cmd => (
            <button
              key={cmd.href}
              onClick={() => { router.push(cmd.href); setCommandPaletteOpen(false); setQuery('') }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <cmd.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{cmd.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{cmd.group}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
          )}
        </div>
      </div>
    </div>
  )
}
