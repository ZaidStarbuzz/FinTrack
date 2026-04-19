'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { User, Bell, Palette, Shield, Database, LogOut, Save } from 'lucide-react'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD']

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        setProfile(p)
      }
      setLoading(false)
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      currency: profile.currency,
    }).eq('id', profile.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile saved')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <DashboardLayout title="Settings"><div className="flex justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div></DashboardLayout>

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                value={profile?.full_name || ''}
                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input value={profile?.email || ''} disabled className="w-full px-3 py-2.5 rounded-lg border bg-muted text-muted-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Base Currency</label>
              <select
                value={profile?.currency || 'INR'}
                onChange={e => setProfile({ ...profile, currency: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Appearance</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="flex gap-3">
              {['light', 'dark', 'system'].map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-3 rounded-lg border capitalize text-sm font-medium transition-colors ${theme === t ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                >
                  {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🖥️'} {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Budget Alerts', desc: 'Get notified when spending approaches budget limits' },
              { label: 'Unusual Spending', desc: 'Alert for transactions above your average' },
              { label: 'Recurring Reminders', desc: 'Reminder before recurring payments' },
              { label: 'Weekly Summary', desc: 'Weekly financial health digest' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button className="relative w-11 h-6 rounded-full bg-primary transition-colors">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Security</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">All data is protected with Row-Level Security in Supabase. Only you can access your financial data.</p>
            <div className="flex gap-3 flex-wrap">
              <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-1.5 rounded-full font-medium">✓ RLS Enabled</span>
              <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-1.5 rounded-full font-medium">✓ Encrypted Transit</span>
              <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-1.5 rounded-full font-medium">✓ Zod Validation</span>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Data Management</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Export all your data or delete your account.</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Export All Data</button>
              <button className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 text-sm hover:bg-red-500/10 transition-colors">Delete Account</button>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </DashboardLayout>
  )
}
