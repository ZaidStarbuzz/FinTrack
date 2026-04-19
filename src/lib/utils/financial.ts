import { Transaction, MonthlySummary, CategorySpending } from '../types'
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, format } from 'date-fns'

export function calculateHealthScore(data: {
  savingsRate: number
  budgetsOnTrack: number
  totalBudgets: number
  hasGoals: boolean
  streakDays: number
  hasEmergencyFund: boolean
}): number {
  let score = 0
  // Savings rate (max 30 points)
  score += Math.min(30, data.savingsRate * 0.6)
  // Budget adherence (max 25 points)
  if (data.totalBudgets > 0) {
    score += (data.budgetsOnTrack / data.totalBudgets) * 25
  }
  // Has goals (10 points)
  if (data.hasGoals) score += 10
  // Streak (max 15 points)
  score += Math.min(15, data.streakDays * 0.5)
  // Emergency fund (20 points)
  if (data.hasEmergencyFund) score += 20
  return Math.round(Math.min(100, score))
}

export function calculateBurnRate(expenses: number[], months = 3): number {
  const recent = expenses.slice(-months)
  return recent.reduce((a, b) => a + b, 0) / recent.length
}

export function calculateRunway(balance: number, burnRate: number): number {
  if (burnRate <= 0) return Infinity
  return Math.round(balance / burnRate)
}

export function calculateLoanSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number
) {
  const monthlyRate = annualRate / 100 / 12
  const emi = monthlyRate === 0
    ? principal / tenureMonths
    : principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1)

  const schedule = []
  let outstanding = principal

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = outstanding * monthlyRate
    const principalComponent = emi - interest
    outstanding -= principalComponent
    schedule.push({
      month: i,
      emi: Math.round(emi * 100) / 100,
      principal: Math.round(principalComponent * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      outstanding: Math.max(0, Math.round(outstanding * 100) / 100),
    })
  }
  return { emi: Math.round(emi * 100) / 100, schedule }
}

export function generateSpendingHeatmap(transactions: Transaction[]) {
  const map = new Map<string, number>()
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const day = format(new Date(t.date), 'yyyy-MM-dd')
      map.set(day, (map.get(day) || 0) + t.amount)
    })
  return map
}

export function detectSpendingSpikes(
  current: CategorySpending[],
  previous: CategorySpending[]
): Array<{ category: string; increase: number; percentage: number }> {
  const spikes: Array<{ category: string; increase: number; percentage: number }> = []
  current.forEach(curr => {
    const prev = previous.find(p => p.category_id === curr.category_id)
    if (prev && prev.total_amount > 0) {
      const increase = curr.total_amount - prev.total_amount
      const percentage = (increase / prev.total_amount) * 100
      if (percentage > 25) {
        spikes.push({ category: curr.category_name, increase, percentage })
      }
    }
  })
  return spikes.sort((a, b) => b.percentage - a.percentage)
}

export function generateSmartInsights(data: {
  currentMonth: MonthlySummary
  previousMonth: MonthlySummary
  categorySpending: CategorySpending[]
  previousCategorySpending: CategorySpending[]
  balance: number
  burnRate: number
}) {
  const insights = []
  const { currentMonth, previousMonth, categorySpending, previousCategorySpending, balance, burnRate } = data

  // Savings rate insight
  const savingsRate = currentMonth.total_income > 0
    ? (currentMonth.net_savings / currentMonth.total_income) * 100 : 0
  if (savingsRate < 10) {
    insights.push({ type: 'warning', title: 'Low Savings Rate', message: `You're saving only ${savingsRate.toFixed(1)}% of income. Aim for 20%+.` })
  } else if (savingsRate > 30) {
    insights.push({ type: 'success', title: 'Great Savings!', message: `Excellent! You're saving ${savingsRate.toFixed(1)}% of your income.` })
  }

  // Spending comparison
  if (previousMonth.total_expense > 0) {
    const diff = ((currentMonth.total_expense - previousMonth.total_expense) / previousMonth.total_expense) * 100
    if (diff > 20) {
      insights.push({ type: 'warning', title: 'Spending Increased', message: `Expenses up ${diff.toFixed(1)}% compared to last month.` })
    } else if (diff < -10) {
      insights.push({ type: 'success', title: 'Spending Decreased', message: `Great job! Expenses down ${Math.abs(diff).toFixed(1)}% from last month.` })
    }
  }

  // Top spending category
  if (categorySpending.length > 0) {
    const top = categorySpending[0]
    insights.push({ type: 'info', title: `Top Spend: ${top.category_name}`, message: `₹${top.total_amount.toLocaleString('en-IN')} (${top.percentage?.toFixed(1)}% of expenses)` })
  }

  // Runway
  const runway = calculateRunway(balance, burnRate)
  if (runway < 3) {
    insights.push({ type: 'warning', title: 'Low Runway', message: `At current burn rate, funds last only ${runway} months.` })
  }

  return insights
}
