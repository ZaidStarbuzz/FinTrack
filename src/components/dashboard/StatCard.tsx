'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency, formatShortCurrency } from '@/lib/utils/format'
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: number
  currency?: string
  change?: number
  changeLabel?: string
  icon: ReactNode
  iconBg?: string
  format?: 'currency' | 'percentage' | 'number'
  size?: 'sm' | 'md'
  subtitle?: string
}

export function StatCard({ title, value, currency = 'INR', change, changeLabel, icon, iconBg = 'bg-primary/10', format = 'currency', size = 'md', subtitle }: StatCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  const displayValue = format === 'currency'
    ? formatCurrency(value, currency)
    : format === 'percentage'
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('en-IN')

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={cn('p-2 rounded-lg', iconBg)}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className={cn('font-bold tracking-tight', size === 'md' ? 'text-2xl' : 'text-xl')}>{displayValue}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground')}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{change.toFixed(1)}% {changeLabel || 'vs last month'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
