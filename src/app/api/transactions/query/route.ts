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

const PAGE_SIZE = 25

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
    const page = typeof body.page === 'number' ? body.page : 0

    // Normalize category filters: accept singular categoryId, categoryName, and optional includeChildren flag
    let categoryIds: string[] | undefined = undefined
    if (filters.categoryIds && Array.isArray(filters.categoryIds)) categoryIds = filters.categoryIds
    else if (filters.categoryId) categoryIds = [filters.categoryId]
    else if (filters.categoryName) {
      // find categories matching the name (case-insensitive)
      const { data: nameMatches, error: nameErr } = await supabase.from('categories').select('id').ilike('name', `%${filters.categoryName}%`).or(`user_id.eq.${payload.sub},user_id.is.null`)
      if (nameErr) return NextResponse.json({ error: nameErr.message }, { status: 500 })
      categoryIds = (nameMatches || []).map((r:any)=>r.id)
    }

    // If includeChildren flag is set and we have categoryIds, expand to include descendant categories
    if (filters.includeCategoryChildren && categoryIds && categoryIds.length) {
      // fetch all categories for this user + system categories to build tree
      const { data: allCats, error: catsErr } = await supabase.from('categories').select('id,parent_id').or(`user_id.eq.${payload.sub},user_id.is.null`)
      if (catsErr) return NextResponse.json({ error: catsErr.message }, { status: 500 })
  const childrenMap: Record<string,string[]> = {} as Record<string,string[]>
      (allCats || []).forEach((c:any)=>{
        const pid = c.parent_id
        if (!childrenMap[pid || 'root']) childrenMap[pid || 'root'] = []
        childrenMap[pid || 'root'].push(c.id)
      })
      // BFS to collect descendants
      const expanded = new Set<string>(categoryIds)
      const queue = [...categoryIds]
      while (queue.length) {
        const cur = queue.shift()!
        const kids = childrenMap[cur] || []
        kids.forEach((k)=>{
          if (!expanded.has(k)) { expanded.add(k); queue.push(k) }
        })
      }
      categoryIds = Array.from(expanded)
    }

    let query = supabase
      .from('transactions')
      .select(`*, account:accounts!transactions_account_id_fkey(*), transfer_account:accounts!transactions_transfer_account_id_fkey(*), category:categories(*)`, { count: 'exact' })
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.from) query = query.gte('date', filters.from)
    if (filters.to) query = query.lte('date', filters.to)
    if (filters.types?.length) query = query.in('type', filters.types)
  if (categoryIds && categoryIds.length) query = query.in('category_id', categoryIds)
    if (filters.accountIds?.length) query = query.in('account_id', filters.accountIds)
    if (filters.amountMin != null) query = query.gte('amount', filters.amountMin)
    if (filters.amountMax != null) query = query.lte('amount', filters.amountMax)
    if (filters.status?.length) query = query.in('status', filters.status)
    if (filters.search) query = query.ilike('description', `%${filters.search}%`)
    if (filters.tags?.length) query = query.overlaps('tags', filters.tags)

    // Always filter by user_id (server enforces this)
    query = query.eq('user_id', payload.sub)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count: count || 0 })
  } catch (e: any) {
    console.error('Transactions query error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
