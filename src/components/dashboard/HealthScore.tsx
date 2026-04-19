'use client'
import { cn } from '@/lib/utils/format'

interface HealthScoreProps { score: number; size?: 'sm' | 'lg' }

export function HealthScore({ score, size = 'lg' }: HealthScoreProps) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
  const r = size === 'lg' ? 45 : 30
  const strokeWidth = size === 'lg' ? 8 : 6
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const dim = (r + strokeWidth) * 2

  return (
    <div className={cn('flex flex-col items-center gap-2', size === 'sm' && 'scale-75')}>
      <div className="relative">
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
          <circle
            cx={dim/2} cy={dim/2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rotate-0">
          <span className={cn('font-bold', size === 'lg' ? 'text-2xl' : 'text-base')} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      {size === 'lg' && (
        <>
          <p className="font-semibold text-sm" style={{ color }}>{label}</p>
          <p className="text-xs text-muted-foreground">Financial Health Score</p>
        </>
      )}
    </div>
  )
}
