'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'
import { generateSmartInsights, calculateBurnRate, calculateRunway } from '../utils/financial'

const supabase = createClient()

export function useMonthlyTrends(months = 12) {
  return useQuery({
    queryKey: ['monthly-trends', months],
    queryFn: async () => {
      const now = new Date()
      const from = subMonths(startOfMonth(now), months - 1)
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount, date')
        .gte('date', from.toISOString())
        .neq('status', 'void')
        .neq('type', 'transfer')
      if (error) throw error

      const monthMap = new Map<string, { income: number; expense: number }>()
      for (let i = 0; i < months; i++) {
        const m = subMonths(now, months - 1 - i)
        monthMap.set(format(m, 'yyyy-MM'), { income: 0, expense: 0 })
      }
      ;(data || []).forEach(t => {
        const key = format(new Date(t.date), 'yyyy-MM')
        const existing = monthMap.get(key)
        if (existing) {
          if (t.type === 'income') existing.income += t.amount
          else if (t.type === 'expense') existing.expense += t.amount
        }
      })

      return Array.from(monthMap.entries()).map(([month, { income, expense }]) => ({
        month,
        label: format(new Date(month + '-01'), 'MMM yy'),
        income,
        expense,
        savings: income - expense,
        savings_rate: income > 0 ? ((income - expense) / income) * 100 : 0,
      }))
    },
  })
}

export function useSpendingHeatmap() {
  return useQuery({
    queryKey: ['spending-heatmap'],
    queryFn: async () => {
      const end = new Date()
      const start = subMonths(end, 3)
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, date')
        .eq('type', 'expense')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .neq('status', 'void')
      if (error) throw error

      const map = new Map<string, number>()
      ;(data || []).forEach(t => {
        const day = format(new Date(t.date), 'yyyy-MM-dd')
        map.set(day, (map.get(day) || 0) + t.amount)
      })

      const days = eachDayOfInterval({ start, end })
      return days.map(d => ({
        date: format(d, 'yyyy-MM-dd'),
        amount: map.get(format(d, 'yyyy-MM-dd')) || 0,
      }))
    },
  })
}

export function useSmartInsights() {
  return useQuery({
    queryKey: ['smart-insights'],
    queryFn: async () => {
      const now = new Date()
      const currStart = startOfMonth(now).toISOString()
      const currEnd = endOfMonth(now).toISOString()
      const prevStart = startOfMonth(subMonths(now, 1)).toISOString()
      const prevEnd = endOfMonth(subMonths(now, 1)).toISOString()

      const [currTxs, prevTxs, accounts] = await Promise.all([
        supabase.from('transactions').select('type,amount,category_id,categories(name,icon,color)').gte('date', currStart).lte('date', currEnd).neq('status', 'void').neq('type', 'transfer'),
        supabase.from('transactions').select('type,amount,category_id').gte('date', prevStart).lte('date', prevEnd).neq('status', 'void').neq('type', 'transfer'),
        supabase.from('accounts').select('balance').eq('status', 'active'),
      ])

      const curr = currTxs.data || []
      const prev = prevTxs.data || []
      const totalBalance = (accounts.data || []).reduce((s, a) => s + a.balance, 0)

      const currIncome = curr.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const currExpense = curr.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const prevExpense = prev.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      const catMap = new Map<string, { name: string; amount: number }>()
      curr.filter(t => t.type === 'expense').forEach(t => {
        const key = t.category_id || 'other'
        const cat = (t as any).categories
        const e = catMap.get(key) || { name: cat?.name || 'Other', amount: 0 }
        e.amount += t.amount
        catMap.set(key, e)
      })
      const topCategories = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount)

      const burnRate = calculateBurnRate([prevExpense, currExpense])
      const runway = calculateRunway(totalBalance, burnRate)

      const insights = []
      const savingsRate = currIncome > 0 ? ((currIncome - currExpense) / currIncome) * 100 : 0

      if (savingsRate >= 20) insights.push({ id: '1', type: 'success' as const, title: 'Great Savings Rate!', message: `You're saving ${savingsRate.toFixed(1)}% of your income this month.` })
      else if (savingsRate < 10) insights.push({ id: '1', type: 'warning' as const, title: 'Low Savings Rate', message: `You're saving only ${savingsRate.toFixed(1)}%. Try to save at least 20%.` })

      if (prevExpense > 0) {
        const diff = ((currExpense - prevExpense) / prevExpense) * 100
        if (diff > 20) insights.push({ id: '2', type: 'warning' as const, title: 'Spending Spike!', message: `Expenses increased by ${diff.toFixed(1)}% compared to last month.` })
      }

      if (topCategories[0]) insights.push({ id: '3', type: 'info' as const, title: `Top Spend: ${topCategories[0].name}`, message: `₹${topCategories[0].amount.toLocaleString('en-IN')} spent this month.` })

      if (runway < 3 && runway > 0) insights.push({ id: '4', type: 'warning' as const, title: 'Low Runway!', message: `At current spending, your funds last ${runway} months.` })
      else if (runway >= 6) insights.push({ id: '4', type: 'success' as const, title: 'Healthy Runway', message: `Your funds can last ${runway}+ months at current spending.` })

      return insights
    },
  })
}
