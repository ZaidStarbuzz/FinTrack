'use client'
import { useQuery } from '@tanstack/react-query'
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'
import { generateSmartInsights, calculateBurnRate, calculateRunway } from '../utils/financial'

export function useMonthlyTrends(months = 12) {
  return useQuery({
    queryKey: ['monthly-trends', months],
    queryFn: async () => {
      const now = new Date()
      const from = subMonths(startOfMonth(now), months - 1)
      // fetch transactions from server-side endpoint
      const res = await fetch('/api/transactions/query', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filters: { from: from.toISOString(), to: endOfMonth(now).toISOString() }, page: 0 }) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to fetch transactions')
      const data = payload.data || []

      const monthMap = new Map<string, { income: number; expense: number }>()
      for (let i = 0; i < months; i++) {
        const m = subMonths(now, months - 1 - i)
        monthMap.set(format(m, 'yyyy-MM'), { income: 0, expense: 0 })
      }
      ;(data || []).forEach((t:any) => {
        if (t.status === 'void' || t.type === 'transfer') return
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
      const res = await fetch('/api/transactions/query', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filters: { from: start.toISOString(), to: end.toISOString(), types: ['expense'] }, page: 0 }) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to fetch transactions')
      const data = payload.data || []

      const map = new Map<string, number>()
      ;(data || []).forEach((t:any) => {
        if (t.status === 'void') return
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

      const [currRes, prevRes, accountsRes] = await Promise.all([
        fetch('/api/transactions/stats', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filters: { from: currStart, to: currEnd } }) }),
        fetch('/api/transactions/stats', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filters: { from: prevStart, to: prevEnd } }) }),
        fetch('/api/accounts', { credentials: 'include' }),
      ])
      const currPayload = await currRes.json()
      const prevPayload = await prevRes.json()
      const accountsPayload = await accountsRes.json()
      if (!currRes.ok) throw new Error(currPayload?.error || 'Failed to fetch current month stats')
      if (!prevRes.ok) throw new Error(prevPayload?.error || 'Failed to fetch previous month stats')
      if (!accountsRes.ok) throw new Error(accountsPayload?.error || 'Failed to fetch accounts')

      const curr = currPayload || { income: 0, expenses: 0, categorySpending: [] }
      const prev = prevPayload || { income: 0, expenses: 0 }
      const totalBalance = (accountsPayload.accounts || []).reduce((s: number, a: any) => s + (a.balance || 0), 0)

  const currIncome = currPayload.income || 0
  const currExpense = currPayload.expenses || 0
  const prevExpense = prevPayload.expenses || 0

      // currPayload contains income, expenses, categorySpending
      const topCategories = (currPayload.categorySpending || [])

      const burnRate = calculateBurnRate([prevPayload.expenses || 0, currPayload.expenses || 0])
      const runway = calculateRunway(totalBalance, burnRate)

      const insights: any[] = []
      const savingsRate = (currPayload.income || 0) > 0 ? (((currPayload.income || 0) - (currPayload.expenses || 0)) / (currPayload.income || 0)) * 100 : 0

      if (savingsRate >= 20) insights.push({ id: '1', type: 'success' as const, title: 'Great Savings Rate!', message: `You're saving ${savingsRate.toFixed(1)}% of your income this month.` })
      else if (savingsRate < 10) insights.push({ id: '1', type: 'warning' as const, title: 'Low Savings Rate', message: `You're saving only ${savingsRate.toFixed(1)}%. Try to save at least 20%.` })

      if ((prevPayload.expenses || 0) > 0) {
        const diff = (((currPayload.expenses || 0) - (prevPayload.expenses || 0)) / (prevPayload.expenses || 0)) * 100
        if (diff > 20) insights.push({ id: '2', type: 'warning' as const, title: 'Spending Spike!', message: `Expenses increased by ${diff.toFixed(1)}% compared to last month.` })
      }

      if (topCategories[0]) insights.push({ id: '3', type: 'info' as const, title: `Top Spend: ${topCategories[0].category_name}`, message: `₹${(topCategories[0].total_amount || 0).toLocaleString('en-IN')} spent this month.` })

      if (runway < 3 && runway > 0) insights.push({ id: '4', type: 'warning' as const, title: 'Low Runway!', message: `At current spending, your funds last ${runway} months.` })
      else if (runway >= 6) insights.push({ id: '4', type: 'success' as const, title: 'Healthy Runway', message: `Your funds can last ${runway}+ months at current spending.` })

      return insights
    },
  })
}
