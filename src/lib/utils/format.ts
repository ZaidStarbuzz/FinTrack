import { format, parseISO, formatDistanceToNow } from 'date-fns'

export function formatCurrency(
  amount: number,
  currency = 'INR',
  locale = 'en-IN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale).format(num)
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatShortCurrency(amount: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : '$'
  if (Math.abs(amount) >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`
  if (Math.abs(amount) >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`
  if (Math.abs(amount) >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`
  return `${symbol}${amount.toFixed(0)}`
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}
