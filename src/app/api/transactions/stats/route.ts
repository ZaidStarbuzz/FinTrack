import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/server/auth'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')

function parseCookie(cookieHeader = '') {
  return cookieHeader.split(';').map(p => p.trim()).reduce((acc: Record<string,string>, p) => {
    const [k,v] = p.split('=')
    if (k && v) acc[k]=v
    return acc
  }, {})
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const cookies = parseCookie(cookieHeader)
    const token = cookies['token']
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload: any = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const filters = body.filters || {}

    let query = supabase.from('transactions').select('type,amount,category_id,categories(name,icon,color)').neq('status', 'void')
    if (filters.from) query = query.gte('date', filters.from)
    if (filters.to) query = query.lte('date', filters.to)
    if (filters.accountIds?.length) query = query.in('account_id', filters.accountIds)
    if (filters.categoryIds?.length) query = query.in('category_id', filters.categoryIds)
    if (filters.types?.length) query = query.in('type', filters.types)

    query = query.eq('user_id', payload.sub)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const income = (data || []).filter((t:any)=>t.type==='income').reduce((s:any,t:any)=>s + Number(t.amount),0)
    const expenses = (data || []).filter((t:any)=>t.type==='expense').reduce((s:any,t:any)=>s + Number(t.amount),0)
    const net = income - expenses
    const savingsRate = income > 0 ? (net / income) * 100 : 0

    const catMap = new Map<any, any>()
    ;(data || []).filter((t:any)=>t.type==='expense').forEach((t:any)=>{
      const key = t.category_id || 'uncategorized'
      const cat = (t as any).categories
      const existing = catMap.get(key) || { name: cat?.name || 'Uncategorized', icon: cat?.icon || 'package', color: cat?.color || '#888', amount:0, count:0 }
      existing.amount += Number(t.amount)
      existing.count += 1
      catMap.set(key, existing)
    })

    const categorySpending = Array.from(catMap.entries()).map((entry: any) => {
      const [id, v] = entry
      const percentage = expenses > 0 ? (v.amount / expenses) * 100 : 0
      return { category_id: id, category_name: v.name, icon: v.icon, color: v.color, total_amount: v.amount, transaction_count: v.count, percentage }
    }).sort((a:any,b:any)=>b.total_amount - a.total_amount)

    return NextResponse.json({ income, expenses, net, savingsRate, categorySpending, transactionCount: (data||[]).length })
  } catch (e:any) {
    console.error('Transactions stats error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
