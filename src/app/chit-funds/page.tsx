'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { useChitFunds, useCreateChitFund, useMarkChitPayment } from '@/lib/hooks/useChitFunds'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { chitFundSchema, ChitFundInput } from '@/lib/validations/transaction'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Plus, Coins, TrendingUp, TrendingDown, Calendar, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/format'

export default function ChitFundsPage() {
  const { data: chitFunds = [], isLoading } = useChitFunds()
  const { data: accounts = [] } = useAccounts()
  const createMutation = useCreateChitFund()
  const markPaymentMutation = useMarkChitPayment()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payAccountId, setPayAccountId] = useState('')

  const form = useForm<ChitFundInput>({
    resolver: zodResolver(chitFundSchema),
    defaultValues: { start_date: new Date().toISOString().split('T')[0] },
  })

  const totalContributed = chitFunds.reduce((s, cf) => s + (cf.total_contributed || 0), 0)
  const totalReceived = chitFunds.reduce((s, cf) => s + (cf.total_received || 0), 0)
  const activeChits = chitFunds.filter(cf => cf.status === 'active')

  return (
    <DashboardLayout title="Chit Funds">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Active Chits</p>
            <p className="text-2xl font-bold">{activeChits.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Contributed</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalContributed)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Received</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalReceived)}</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Chit Funds</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> New Chit Fund
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : chitFunds.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No chit funds tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chitFunds.map(cf => (
              <div key={cf.id} className="rounded-xl border bg-card overflow-hidden">
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === cf.id ? null : cf.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{cf.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cf.duration_months} months · {formatCurrency(cf.monthly_contribution)}/month
                        </p>
                        {cf.organizer_name && <p className="text-xs text-muted-foreground">Organizer: {cf.organizer_name}</p>}
                      </div>
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', cf.status === 'active' ? 'bg-green-500/10 text-green-500' : cf.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      {cf.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold text-sm">{formatCurrency(cf.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contributed</p>
                      <p className="font-semibold text-sm text-red-500">{formatCurrency(cf.total_contributed || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Received</p>
                      <p className="font-semibold text-sm text-green-500">{formatCurrency(cf.total_received || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <p className={cn('font-semibold text-sm', (cf.net_profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                        {(cf.net_profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(cf.net_profit_loss || 0)}
                      </p>
                    </div>
                  </div>

                  {cf.months_remaining !== undefined && cf.status === 'active' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{cf.months_remaining} months remaining</span>
                      {cf.payout_month && <span>· Payout: Month {cf.payout_month}</span>}
                      {cf.roi && <span>· ROI: {cf.roi.toFixed(1)}%</span>}
                    </div>
                  )}
                </div>

                {/* Payment schedule */}
                {expandedId === cf.id && cf.payments && cf.payments.length > 0 && (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Payment Schedule</p>
                      {accounts.length > 0 && (
                        <select
                          value={payAccountId}
                          onChange={e => setPayAccountId(e.target.value)}
                          className="text-xs px-2 py-1 rounded-lg border bg-background"
                        >
                          <option value="">Select account to mark paid</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {cf.payments.map(p => (
                        <div key={p.id} className={cn('flex items-center justify-between p-2.5 rounded-lg border text-sm', p.is_payout ? 'border-green-500/30 bg-green-500/5' : '')}>
                          <div className="flex items-center gap-2">
                            {p.status === 'paid' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              : p.status === 'overdue' ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              : <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                            <div>
                              <p className="font-medium">{p.is_payout ? '💰 Payout' : `Month ${p.month_number}`}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(p.due_date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={cn('font-semibold', p.is_payout ? 'text-green-500' : '')}>{formatCurrency(p.amount)}</p>
                            {p.status === 'pending' && payAccountId && (
                              <button
                                onClick={() => markPaymentMutation.mutate({ paymentId: p.id, accountId: payAccountId })}
                                disabled={markPaymentMutation.isPending}
                                className="px-2 py-1 text-xs rounded bg-primary text-white hover:bg-primary/90 transition-colors"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Chit Fund</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">✕</button>
            </div>
            <form onSubmit={form.handleSubmit(async d => { await createMutation.mutateAsync(d); setShowForm(false) })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input {...form.register('name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Office Chit 2024" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount *</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input type="number" {...form.register('total_amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly *</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input type="number" {...form.register('monthly_contribution', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (months) *</label>
                  <input type="number" {...form.register('duration_months', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input type="date" {...form.register('start_date')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Payout Month</label>
                  <input type="number" placeholder="e.g. 6" {...form.register('payout_month', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payout Amount</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input type="number" {...form.register('payout_amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organizer Name</label>
                <input {...form.register('organizer_name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Optional" />
              </div>
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Chit Fund'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
