'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { StatCard } from '@/components/dashboard/StatCard'
import { HealthScore } from '@/components/dashboard/HealthScore'
import { useTransactionStats } from '@/lib/hooks/useTransactions'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useBudgets } from '@/lib/hooks/useBudgets'
import { useGoals } from '@/lib/hooks/useGoals'
import { useMonthlyTrends, useSmartInsights } from '@/lib/hooks/useAnalytics'
import { useAppStore } from '@/lib/stores/useAppStore'
import { formatCurrency, formatShortCurrency } from '@/lib/utils/format'
import { calculateBurnRate, calculateRunway } from '@/lib/utils/financial'
import { useState } from 'react'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import {
  TrendingUp, TrendingDown, Wallet, Target, Plus, ArrowUpRight,
  ArrowDownLeft, Info, AlertTriangle, CheckCircle2, Lightbulb,
  CreditCard, Loader2
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

export default function DashboardPage() {
  const { transactionFilters } = useAppStore()
  const { data: stats, isLoading: statsLoading } = useTransactionStats({ datePreset: 'this_month' })
  const { data: accounts = [], isLoading: accsLoading } = useAccounts()
  const { data: budgets = [] } = useBudgets()
  const { data: goals = [] } = useGoals()
  const { data: trends = [] } = useMonthlyTrends(6)
  const { data: insights = [] } = useSmartInsights()
  const [showAddTx, setShowAddTx] = useState(false)

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const recentExpenses = trends.slice(-3).map(t => t.expense)
  const burnRate = calculateBurnRate(recentExpenses)
  const runway = calculateRunway(totalBalance, burnRate)
  const budgetsOnTrack = budgets.filter(b => (b.percentage || 0) < 80).length

  const topExpenseCategories = (stats?.categorySpending || []).slice(0, 5)

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">This Month Overview</p>
          </div>
          <button
            onClick={() => setShowAddTx(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>

        {/* Main Stats */}
        {statsLoading || accsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Balance"
                value={totalBalance}
                icon={<Wallet className="w-5 h-5 text-primary" />}
                iconBg="bg-primary/10"
              />
              <StatCard
                title="Income"
                value={stats?.income || 0}
                icon={<ArrowDownLeft className="w-5 h-5 text-green-500" />}
                iconBg="bg-green-500/10"
              />
              <StatCard
                title="Expenses"
                value={stats?.expenses || 0}
                icon={<ArrowUpRight className="w-5 h-5 text-red-500" />}
                iconBg="bg-red-500/10"
              />
              <StatCard
                title="Net Savings"
                value={stats?.net || 0}
                icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                iconBg="bg-blue-500/10"
                subtitle={`${(stats?.savingsRate || 0).toFixed(1)}% savings rate`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Savings Rate"
                value={stats?.savingsRate || 0}
                format="percentage"
                icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
                iconBg="bg-purple-500/10"
                size="sm"
              />
              <StatCard
                title="Burn Rate"
                value={burnRate}
                icon={<TrendingDown className="w-5 h-5 text-orange-500" />}
                iconBg="bg-orange-500/10"
                size="sm"
                subtitle="avg monthly spend"
              />
              <StatCard
                title="Runway"
                value={runway}
                format="number"
                icon={<Target className="w-5 h-5 text-cyan-500" />}
                iconBg="bg-cyan-500/10"
                size="sm"
                subtitle="months at current burn"
              />
              <StatCard
                title="Transactions"
                value={stats?.transactionCount || 0}
                format="number"
                icon={<CreditCard className="w-5 h-5 text-pink-500" />}
                iconBg="bg-pink-500/10"
                size="sm"
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Trend chart */}
              <div className="md:col-span-2 rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-4 text-sm">Income vs Expenses — Last 6 Months</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trends} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatShortCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category pie + Health score */}
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold mb-3 text-sm">Top Spending</h3>
                  {topExpenseCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={topExpenseCategories} dataKey="total_amount" nameKey="category_name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                          {topExpenseCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
                </div>
                <div className="rounded-xl border bg-card p-4 flex items-center justify-center">
                  <HealthScore score={60 + Math.min(40, Math.round((stats?.savingsRate || 0) * 0.6))} />
                </div>
              </div>
            </div>

            {/* Accounts + Insights Row */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Accounts */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-3 text-sm">Accounts</h3>
                <div className="space-y-2">
                  {accounts.slice(0, 5).map(acc => (
                    <div key={acc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: acc.color + '20' }}>
                          <Wallet className="w-4 h-4" style={{ color: acc.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{acc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{acc.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <p className={`font-semibold text-sm ${acc.balance < 0 ? 'text-red-500' : ''}`}>
                        {formatCurrency(acc.balance)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart insights */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-3 text-sm">Smart Insights</h3>
                <div className="space-y-3">
                  {insights.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add more transactions to get insights.</p>
                  ) : insights.map((insight, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                      insight.type === 'warning' ? 'bg-yellow-500/10' :
                      insight.type === 'success' ? 'bg-green-500/10' : 'bg-primary/10'
                    }`}>
                      {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        : insight.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        : <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />}
                      <div>
                        <p className="text-sm font-medium">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{insight.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Progress */}
            {budgets.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-4 text-sm">Budget Progress</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {budgets.slice(0, 6).map(budget => (
                    <div key={budget.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{budget.name}</span>
                        <span className="text-muted-foreground">{(budget.percentage || 0).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (budget.percentage || 0) >= 100 ? 'bg-red-500' :
                            (budget.percentage || 0) >= 80 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, budget.percentage || 0)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(budget.spent || 0)} spent</span>
                        <span>{formatCurrency(budget.amount)} limit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals */}
            {goals.filter(g => g.status === 'active').length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-4 text-sm">Savings Goals</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {goals.filter(g => g.status === 'active').slice(0, 3).map(goal => (
                    <div key={goal.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{goal.icon === 'target' ? '🎯' : '💰'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{goal.name}</p>
                          {goal.target_date && <p className="text-xs text-muted-foreground">{goal.months_remaining}m left</p>}
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(100, goal.percentage || 0)}%`, backgroundColor: goal.color }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(goal.current_amount)}</span>
                        <span>{formatCurrency(goal.target_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Transaction</h2>
              <button onClick={() => setShowAddTx(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">✕</button>
            </div>
            <TransactionForm onSuccess={() => setShowAddTx(false)} />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
