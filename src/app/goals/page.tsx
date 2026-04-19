'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { useGoals, useCreateGoal, useUpdateGoal } from '@/lib/hooks/useGoals'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { goalSchema, GoalInput } from '@/lib/validations/transaction'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Plus, Target, CheckCircle2, Calendar, TrendingUp, Loader2, Pencil } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/format'

const GOAL_ICONS = ['🎯', '🏠', '✈️', '🚗', '📱', '💰', '🎓', '💍', '🏋️', '🌴']
const GOAL_COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<any>(null)
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: { icon: '🎯', color: '#22c55e', priority: 1, current_amount: 0 },
  })

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const totalTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved = activeGoals.reduce((s, g) => s + g.current_amount, 0)

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount) return
    const goal = goals.find(g => g.id === contributeGoalId)!
    const newAmount = goal.current_amount + parseFloat(contributeAmount)
    await updateMutation.mutateAsync({
      id: contributeGoalId,
      current_amount: newAmount,
      status: newAmount >= goal.target_amount ? 'completed' : 'active',
    })
    setContributeGoalId(null)
    setContributeAmount('')
  }

  return (
    <DashboardLayout title="Goals & Savings">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Active Goals</p>
            <p className="text-2xl font-bold">{activeGoals.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Saved</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalSaved)}</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(totalTarget)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Overall Progress</p>
            <p className="text-2xl font-bold text-primary">
              {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Active Goals</h2>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> New Goal
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : activeGoals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No goals yet. Set a savings goal to get started!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map(goal => (
              <div key={goal.id} className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: goal.color + '20' }}>
                      {goal.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{goal.name}</p>
                      {goal.target_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(goal.target_date, 'dd MMM yyyy')} · {goal.months_remaining}m left</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setEditGoal(goal)} className="p-1 rounded hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, goal.percentage || 0)}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{(goal.percentage || 0).toFixed(1)}% reached</span>
                    <span>{formatCurrency(goal.target_amount - goal.current_amount)} to go</span>
                  </div>
                </div>

                {goal.monthly_contribution && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>₹{goal.monthly_contribution.toLocaleString('en-IN')}/month suggested</span>
                  </div>
                )}

                <button
                  onClick={() => setContributeGoalId(goal.id)}
                  className="w-full py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Add Contribution
                </button>
              </div>
            ))}
          </div>
        )}

        {completedGoals.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-green-500">✅ Completed Goals</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map(goal => (
                <div key={goal.id} className="rounded-xl border bg-card p-4 opacity-75">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <p className="font-medium">{goal.name}</p>
                      <p className="text-sm text-green-500">{formatCurrency(goal.target_amount)} achieved!</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contribute modal */}
      {contributeGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card border rounded-xl shadow-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">Add Contribution</h3>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <input
                type="number" step="0.01" placeholder="0.00" value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setContributeGoalId(null)} className="flex-1 py-2.5 rounded-lg border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleContribute} disabled={updateMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {updateMutation.isPending ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create goal modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Goal</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">✕</button>
            </div>
            <form onSubmit={form.handleSubmit(async d => { await createMutation.mutateAsync(d); setShowForm(false) })} className="space-y-4">
              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => form.setValue('icon', icon)}
                      className={cn('w-10 h-10 text-xl rounded-lg border transition-colors', form.watch('icon') === icon ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Goal Name *</label>
                <input {...form.register('name')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Emergency Fund" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <input type="number" {...form.register('target_amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Saved</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <input type="number" {...form.register('current_amount', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Date</label>
                  <input type="date" {...form.register('target_date')} className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Contribution</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <input type="number" {...form.register('monthly_contribution', { valueAsNumber: true })} className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Goal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
