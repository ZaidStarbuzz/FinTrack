'use client'
import { Bell, Search, Moon, Sun, Plus, Command } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/lib/stores/useAppStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function TopBar({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme()
  const { setCommandPaletteOpen } = useAppStore()
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center gap-2">
        {/* Command palette shortcut */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="flex items-center gap-0.5 text-xs bg-background px-1.5 py-0.5 rounded border">
            <Command className="w-3 h-3" />K
          </kbd>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {user && (
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {user.email?.[0]?.toUpperCase()}
            </div>
          </button>
        )}
      </div>
    </header>
  )
}
