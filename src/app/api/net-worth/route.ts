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

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const cookies = parseCookie(cookieHeader)
    const token = cookies['token']
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload: any = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = payload.sub

    const [assetsRes, accountsRes, loansRes] = await Promise.all([
      supabase.from('assets').select('*').eq('user_id', userId),
      supabase.from('accounts').select('id,name,balance,type,is_excluded_from_net_worth').eq('user_id', userId).neq('status', 'closed'),
      supabase.from('loans').select('outstanding_balance').eq('user_id', userId).eq('status', 'active'),
    ])

    if (assetsRes.error) return NextResponse.json({ error: assetsRes.error.message }, { status: 500 })
    if (accountsRes.error) return NextResponse.json({ error: accountsRes.error.message }, { status: 500 })
    if (loansRes.error) return NextResponse.json({ error: loansRes.error.message }, { status: 500 })

    const assets = assetsRes.data || []
    const accounts = accountsRes.data || []
    const loans = loansRes.data || []

    const manualAssets = (assets || []).reduce((s:any,a:any)=>s + (a.current_value || 0), 0)
    const accountAssets = (accounts || []).filter((a:any)=>!a.is_excluded_from_net_worth && a.balance > 0).reduce((s:any,a:any)=>s + (a.balance || 0),0)
    const liquidAssets = (accounts || []).filter((a:any)=>['bank','cash','wallet'].includes(a.type) && a.balance > 0).reduce((s:any,a:any)=>s + (a.balance || 0),0)

    const totalAssets = manualAssets + accountAssets
    const totalLiabilities = (loans || []).reduce((s:any,l:any)=>s + (l.outstanding_balance || 0),0)
    const netWorth = totalAssets - totalLiabilities

    return NextResponse.json({ assets, accounts, totalAssets, totalLiabilities, netWorth, liquidAssets })
  } catch (e:any) {
    console.error('Net worth error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
