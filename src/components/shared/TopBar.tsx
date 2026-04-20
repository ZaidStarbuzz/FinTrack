"use client";
import { Bell, Search, Moon, Sun, Plus, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/stores/useAppStore";
import { getCurrentUser } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export function TopBar({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();
  const { setCommandPaletteOpen } = useAppStore();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const goToSettings = () => {
    router.push('/settings')
  }

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true)
      const res = await fetch('/api/notifications', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setNotifications(data.notifications || [])
      else console.error('Failed to fetch notifications', data)
    } catch (e) {
      console.error('Notifications fetch error', e)
    } finally {
      setLoadingNotifs(false)
    }
  }

  const markRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id }), headers: { 'content-type': 'application/json' }, credentials: 'include' })
      const data = await res.json()
      if (res.ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      else console.error('Failed to mark read', data)
    } catch (e) {
      console.error('Mark read error', e)
    }
  }

  // close dropdown when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

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
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              const willOpen = !notifOpen
              setNotifOpen(willOpen)
              if (willOpen) await fetchNotifications()
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors relative"
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell className="w-4 h-4" />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-4 px-1 text-xs bg-red-600 rounded-full text-white flex items-center justify-center">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-72 overflow-auto rounded-lg border bg-popover shadow-lg z-50">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                <button className="text-xs text-muted-foreground" onClick={() => { setNotifications([]); }}>Clear</button>
              </div>
              {loadingNotifs && <div className="p-4">Loading...</div>}
              {!loadingNotifs && notifications.length === 0 && <div className="p-4 text-sm text-muted-foreground">No notifications</div>}
              <ul>
                {notifications.map((n) => (
                  <li key={n.id} className={`p-3 border-b hover:bg-muted cursor-pointer ${n.is_read ? 'bg-background' : 'bg-muted/5'}`} onClick={(ev) => {
                    ev.stopPropagation()
                    markRead(n.id)
                    if (n.action_url) router.push(n.action_url)
                  }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{n.message}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {user && (
          <button
            onClick={goToSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {user.email?.[0]?.toUpperCase()}
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
