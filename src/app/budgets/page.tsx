'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { useBudgets, useCreateBudget, useDeleteBudget } from '@/lib/hooks/useBudgets'
import { useFlatCategories } from '@/lib/hooks/useCategories'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { budgetSchema, BudgetInput } from '@/lib/validations/transaction'
import { formatCurrency } from '@/lib/utils/format'
import { Plus, Wallet, AlertTriangle, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/format'

export default function BudgetsPage() {
  const { data: budgets = [], isLoading } = useBudgets()
  const { data: categories = [] } = useFlatCategories('expense')
  const createMutation = useCreateBudget()
  const deleteMutation = useDeleteBudget()
  const [showForm, setShowForm] = useState(false)

  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { period: 'monthly', start_date: format(new Date(), 'yyyy-MM-dd'), rollover: false, alert_at_50: true, alert_at_80: true, alert_at_100: true },
  })

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0)
  const overBudget = budgets.filter(b => (b.percentage || 0) >= 100).length

  return (
    <DashboardLayout title="Budgets">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
            <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-muted-foreground">{totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(0) : 0}% used</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Over Budget</p>
            <p className={cn('text-2xl font-bold', overBudget > 0 ? 'text-red-500' : 'text-green-500')}>{overBudget}</p>
            <p className="text-xs text-muted-foreground">categories</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Active Budgets</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> New Budget
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No budgets yet. Create one to start tracking!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(budget => {
              const pct = Math.min(100, budget.percentage || 0)
              const isOver = pct >= 100
              const isNear = pct >= 80
              return (
                <div key={budget.id} className="rounded-xl border bg-card p-5 relative group">
                  <button
                    onClick={() => deleteMutation.mutate(budget.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', isOver ? 'bg-red-500/10' : isNear ? 'bg-yellow-500/10' : 'bg-primary/10')}>
                      {isOver ? <XCircle className="w-5 h-5 text-red-500" /> : isNear ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> : <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{budget.name}</p>
                      {budget.category && <p className="text-xs text-muted-foreground">{budget.category.icon} {budget.category.name}</p>}
                      <p className="text-xs text-muted-foreground capitalize">{budget.period}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{formatCurrency(budget.spent || 0)}</span>
                      <span className="text-muted-foreground">/ {formatCurrency(budget.amount)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : isNear ? 'bg-yellow-500' : 'bg-primary')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={cn(isOver ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                        {pct.toFixed(0)}% used
                      </span>
                      <span className={cn(isOver ? 'text-red-500' : 'text-green-500', 'font-medium')}>
                        {isOver ? `-${formatCurrency((budget.spent || 0) - budget.amount)} over` : `${formatCurrency(budget.remaining || 0)} left`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Budget</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">✕</button>
            </div>
            <form onSubmit={form.handleSubmit(async d => { await createMutation.mutateAsync(d); setShowForm(false) })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Budget Name *</label>
                <input {...form.register('name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Food Budget" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select {...form.register('category_id')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <input type="number" {...form.register('amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Period</label>
                  <select {...form.register('period')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" {...form.register('start_date')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Alerts</label>
                {[{ key: 'alert_at_50', label: 'Alert at 50%' }, { key: 'alert_at_80', label: 'Alert at 80%' }, { key: 'alert_at_100', label: 'Alert at 100%' }].map(a => (
                  <label key={a.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...form.register(a.key as any)} className="rounded" />
                    <span className="text-sm">{a.label}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Budget'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
