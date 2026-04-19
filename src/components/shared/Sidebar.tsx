'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/format'
import { useAppStore } from '@/lib/stores/useAppStore'
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, PieChart,
  Target, Wallet, TrendingUp, Settings, ChevronLeft,
  ChevronRight, Bell, FileText, Users, BadgeDollarSign,
  CircleDollarSign, Coins, BarChart3
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/budgets', label: 'Budgets', icon: Wallet },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/chit-funds', label: 'Chit Funds', icon: Coins },
  { href: '/loans', label: 'Loans & EMI', icon: BadgeDollarSign },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/net-worth', label: 'Net Worth', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore()

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full z-40 flex flex-col border-r bg-card transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">FinTrack</span>
            <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">PRO</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <CircleDollarSign className="w-5 h-5 text-white" />
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'nav-item',
                active ? 'nav-item-active' : 'nav-item-inactive',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      {sidebarCollapsed && (
        <div className="p-2 border-t">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
