'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/lib/hooks/useAccounts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountSchema, AccountInput } from '@/lib/validations/transaction'
import { Account, AccountType } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/format'
import { Plus, Wallet, CreditCard, Banknote, Smartphone, TrendingUp, Loader2, Trash2, Building2 } from 'lucide-react'
import { useState } from 'react'

const ACCOUNT_ICONS: Record<AccountType, React.ReactNode> = {
  bank: <Building2 className="w-5 h-5" />,
  cash: <Banknote className="w-5 h-5" />,
  credit_card: <CreditCard className="w-5 h-5" />,
  wallet: <Smartphone className="w-5 h-5" />,
  investment: <TrendingUp className="w-5 h-5" />,
  loan: <Wallet className="w-5 h-5" />,
  fixed_deposit: <Wallet className="w-5 h-5" />,
}

function AccountForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutateAsync, isPending } = useCreateAccount()
  const form = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: { type: 'bank', currency: 'INR', balance: 0, color: '#6366f1' },
  })
  const type = form.watch('type')

  return (
    <form onSubmit={form.handleSubmit(async d => { await mutateAsync(d); onSuccess() })} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Account Name *</label>
          <input {...form.register('name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. HDFC Savings" />
          {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select {...form.register('type')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="bank">🏦 Bank Account</option>
            <option value="cash">💵 Cash</option>
            <option value="credit_card">💳 Credit Card</option>
            <option value="wallet">📱 Wallet/UPI</option>
            <option value="investment">📈 Investment</option>
            <option value="fixed_deposit">🏛️ Fixed Deposit</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Opening Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <input type="number" step="0.01" {...form.register('balance', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <input type="color" {...form.register('color')} className="w-full h-10 rounded-lg border bg-background cursor-pointer" />
        </div>
      </div>

      {type === 'bank' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <input {...form.register('bank_name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. HDFC, SBI" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last 4 Digits</label>
            <input {...form.register('account_number_last4')} maxLength={4} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="XXXX" />
          </div>
        </div>
      )}

      {type === 'credit_card' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Credit Limit</label>
            <input type="number" {...form.register('credit_limit', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Billing Day</label>
            <input type="number" min={1} max={31} {...form.register('billing_cycle_day', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Day</label>
            <input type="number" min={1} max={31} {...form.register('due_date_day', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      )}

      <button type="submit" disabled={isPending} className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {isPending ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  )
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts()
  const deleteMutation = useDeleteAccount()
  const [showForm, setShowForm] = useState(false)

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const positiveAccounts = accounts.filter(a => a.balance >= 0)
  const creditAccounts = accounts.filter(a => a.type === 'credit_card')

  return (
    <DashboardLayout title="Accounts">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-2">Total Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">{accounts.length} accounts</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-2">Assets</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(positiveAccounts.reduce((s, a) => s + a.balance, 0))}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-2">Credit Outstanding</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(creditAccounts.reduce((s, a) => s + Math.abs(Math.min(0, a.balance)), 0))}</p>
          </div>
        </div>

        {/* Add button */}
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">All Accounts</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="rounded-xl border bg-card p-5 relative group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: acc.color + '20', color: acc.color }}>
                      {ACCOUNT_ICONS[acc.type]}
                    </div>
                    <div>
                      <p className="font-semibold">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(acc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className={`text-2xl font-bold ${acc.balance < 0 ? 'text-red-500' : ''}`}>
                  {formatCurrency(acc.balance)}
                </p>
                {acc.bank_name && <p className="text-xs text-muted-foreground mt-1">{acc.bank_name} {acc.account_number_last4 ? `••••${acc.account_number_last4}` : ''}</p>}
                {acc.type === 'credit_card' && acc.credit_limit && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Used</span>
                      <span>{(Math.abs(Math.min(0, acc.balance)) / acc.credit_limit * 100).toFixed(0)}% of {formatCurrency(acc.credit_limit)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, Math.abs(Math.min(0, acc.balance)) / acc.credit_limit * 100)}%` }} />
                    </div>
                  </div>
                )}
                {acc.is_default && <span className="absolute top-3 right-3 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Account</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">✕</button>
            </div>
            <AccountForm onSuccess={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
