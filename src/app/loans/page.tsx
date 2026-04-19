'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { useLoans, useCreateLoan, usePayLoanEMI } from '@/lib/hooks/useLoans'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loanSchema, LoanInput } from '@/lib/validations/transaction'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calculateLoanSchedule } from '@/lib/utils/financial'
import { Plus, BadgeDollarSign, TrendingDown, Calendar, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/format'
import { addMonths } from 'date-fns'

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: '👤 Personal', home: '🏠 Home', auto: '🚗 Auto',
  education: '🎓 Education', business: '💼 Business', credit_card: '💳 Credit Card', other: '📋 Other'
}

export default function LoansPage() {
  const { data: loans = [], isLoading } = useLoans()
  const { data: accounts = [] } = useAccounts()
  const createMutation = useCreateLoan()
  const payEMIMutation = usePayLoanEMI()
  const [showForm, setShowForm] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [payAccountId, setPayAccountId] = useState('')

  const form = useForm<LoanInput>({
    resolver: zodResolver(loanSchema),
    defaultValues: { type: 'personal', emi_due_day: 1, start_date: new Date().toISOString().split('T')[0] },
  })

  const principalAmount = form.watch('principal_amount')
  const interestRate = form.watch('interest_rate')
  const tenureMonths = form.watch('tenure_months')

  let calculatedEMI = 0
  if (principalAmount && interestRate && tenureMonths) {
    try { calculatedEMI = calculateLoanSchedule(principalAmount, interestRate, tenureMonths).emi } catch {}
  }

  const activeLoans = loans.filter(l => l.status === 'active')
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding_balance, 0)
  const totalEMI = activeLoans.reduce((s, l) => s + l.emi_amount, 0)

  return (
    <DashboardLayout title="Loans & EMI">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Active Loans</p>
            <p className="text-2xl font-bold">{activeLoans.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Monthly EMI</p>
            <p className="text-2xl font-bold text-orange-500">{formatCurrency(totalEMI)}</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Active Loans</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Loan
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BadgeDollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No loans tracked. Add a loan to monitor EMIs.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loans.map(loan => (
              <div key={loan.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <BadgeDollarSign className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{loan.name}</p>
                      <p className="text-xs text-muted-foreground">{LOAN_TYPE_LABELS[loan.type]}</p>
                      {loan.lender_name && <p className="text-xs text-muted-foreground">{loan.lender_name}</p>}
                    </div>
                  </div>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', loan.status === 'active' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500')}>
                    {loan.status}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Repaid</span>
                    <span className="font-medium">{(loan.completion_percentage || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${loan.completion_percentage || 0}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Principal', value: formatCurrency(loan.principal_amount) },
                    { label: 'Outstanding', value: formatCurrency(loan.outstanding_balance), red: true },
                    { label: 'EMI', value: formatCurrency(loan.emi_amount) },
                    { label: 'Rate', value: `${loan.interest_rate}%` },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={cn('font-semibold text-sm', item.red ? 'text-red-500' : '')}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>EMI due on {loan.emi_due_day}th · {loan.months_remaining} months left</span>
                  </div>
                  {loan.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={payAccountId}
                        onChange={e => setPayAccountId(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border bg-background"
                      >
                        <option value="">Select account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <button
                        onClick={() => payEMIMutation.mutate({ loanId: loan.id, accountId: payAccountId })}
                        disabled={!payAccountId || payEMIMutation.isPending}
                        className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        Pay EMI
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Add Loan</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">✕</button>
            </div>
            <form onSubmit={form.handleSubmit(async d => { await createMutation.mutateAsync(d); setShowForm(false) })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loan Name *</label>
                <input {...form.register('name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. HDFC Home Loan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select {...form.register('type')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    {Object.entries(LOAN_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lender</label>
                  <input {...form.register('lender_name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Bank/NBFC name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Principal *</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input type="number" {...form.register('principal_amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate % *</label>
                  <input type="number" step="0.01" {...form.register('interest_rate', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 8.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenure (months) *</label>
                  <input type="number" {...form.register('tenure_months', { valueAsNumber: true })} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input type="date" {...form.register('start_date')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              {/* EMI calculator */}
              {calculatedEMI > 0 && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Calculated EMI</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(calculatedEMI)}/month</p>
                  <button type="button" onClick={() => form.setValue('emi_amount', calculatedEMI)} className="text-xs text-primary mt-1 underline">Use this amount</button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">EMI Amount *</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <input type="number" {...form.register('emi_amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              </div>

              <button type="submit" disabled={createMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Adding...' : 'Add Loan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
