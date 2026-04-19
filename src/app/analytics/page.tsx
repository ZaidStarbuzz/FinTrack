'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { useMonthlyTrends, useSpendingHeatmap } from '@/lib/hooks/useAnalytics'
import { useTransactionStats } from '@/lib/hooks/useTransactions'
import { useAppStore } from '@/lib/stores/useAppStore'
import { formatCurrency, formatShortCurrency } from '@/lib/utils/format'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Loader2 } from 'lucide-react'

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#10b981','#f43f5e']

export default function AnalyticsPage() {
  const { transactionFilters } = useAppStore()
  const { data: stats, isLoading: statsLoading } = useTransactionStats(transactionFilters)
  const { data: trends = [], isLoading: trendsLoading } = useMonthlyTrends(12)
  const { data: heatmap = [] } = useSpendingHeatmap()
  const [trendType, setTrendType] = useState<'bar'|'area'|'line'>('bar')

  const maxHeat = Math.max(...heatmap.map(d => d.amount), 1)
  const heatByWeek: { week: string; days: { date: string; amount: number }[] }[] = []
  for (let i = 0; i < heatmap.length; i += 7) {
    heatByWeek.push({ week: `W${Math.floor(i/7)+1}`, days: heatmap.slice(i, i+7) })
  }

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Category breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Expense by Category</h3>
            {statsLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats?.categorySpending || []} dataKey="total_amount" nameKey="category_name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                      {(stats?.categorySpending || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {(stats?.categorySpending || []).slice(0, 6).map((cat, i) => (
                    <div key={cat.category_id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm flex-1 truncate">{cat.category_name}</span>
                      <span className="text-sm font-medium">{formatCurrency(cat.total_amount)}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{cat.percentage?.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Stats summary */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold mb-4">Period Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Income', value: stats?.income || 0, color: 'text-green-500' },
                  { label: 'Total Expenses', value: stats?.expenses || 0, color: 'text-red-500' },
                  { label: 'Net Savings', value: (stats?.income || 0) - (stats?.expenses || 0), color: (stats?.income || 0) > (stats?.expenses || 0) ? 'text-green-500' : 'text-red-500' },
                  { label: 'Savings Rate', value: stats?.savingsRate || 0, color: 'text-primary', isPercent: true },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`font-semibold ${item.color}`}>
                      {item.isPercent ? `${item.value.toFixed(1)}%` : formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold mb-3">Top Categories</h3>
              <div className="space-y-2">
                {(stats?.categorySpending || []).slice(0, 4).map((cat, i) => (
                  <div key={cat.category_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{cat.category_name}</span>
                      <span className="font-medium">{cat.percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly trends */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Monthly Trends — Last 12 Months</h3>
            <div className="flex rounded-lg border overflow-hidden text-xs">
              {(['bar','area','line'] as const).map(t => (
                <button key={t} onClick={() => setTrendType(t)} className={`px-3 py-1.5 capitalize transition-colors ${trendType === t ? 'bg-primary text-white' : 'hover:bg-muted'}`}>{t}</button>
              ))}
            </div>
          </div>
          {trendsLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
            <ResponsiveContainer width="100%" height={300}>
              {trendType === 'bar' ? (
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatShortCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" radius={[3,3,0,0]} name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[3,3,0,0]} name="Expense" />
                  <Bar dataKey="savings" fill="#6366f1" radius={[3,3,0,0]} name="Savings" />
                </BarChart>
              ) : trendType === 'area' ? (
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatShortCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="income" fill="#22c55e" stroke="#22c55e" fillOpacity={0.2} name="Income" />
                  <Area type="monotone" dataKey="expense" fill="#ef4444" stroke="#ef4444" fillOpacity={0.2} name="Expense" />
                </AreaChart>
              ) : (
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatShortCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" />
                  <Line type="monotone" dataKey="savings_rate" stroke="#6366f1" strokeWidth={2} dot={false} name="Savings Rate %" yAxisId="right" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Spending Heatmap */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Daily Spending Heatmap — Last 3 Months</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {heatByWeek.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.days.map((day, di) => (
                    <div
                      key={di}
                      title={`${day.date}: ${formatCurrency(day.amount)}`}
                      className="w-3 h-3 rounded-sm transition-colors cursor-pointer"
                      style={{
                        backgroundColor: day.amount === 0
                          ? 'hsl(var(--muted))'
                          : `rgba(99,102,241,${0.15 + (day.amount / maxHeat) * 0.85})`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {[0.2, 0.4, 0.6, 0.8, 1].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(99,102,241,${o})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
