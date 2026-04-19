'use client'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAppStore } from '@/lib/stores/useAppStore'
import { cn } from '@/lib/utils/format'
import { CommandPalette } from './CommandPalette'

export function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { sidebarCollapsed } = useAppStore()
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-64')}>
        <TopBar title={title} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  )
}
