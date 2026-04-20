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
    // Force the user_id to the authenticated user to satisfy RLS / integrity
    const input = { ...body, user_id: payload.sub }

    const { data, error } = await supabase.from('accounts').insert(input).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ account: data })
  } catch (e: any) {
    console.error('Create account error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const cookies = parseCookie(cookieHeader)
    const token = cookies['token']
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload: any = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Ensure we only update rows that belong to the user
    const { data, error } = await supabase.from('accounts').update(body).match({ id, user_id: payload.sub }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ account: data })
  } catch (e: any) {
    console.error('Update account error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const cookies = parseCookie(cookieHeader)
    const token = cookies['token']
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload: any = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Soft-delete by setting status to closed, only if belongs to user
    const { error } = await supabase.from('accounts').update({ status: 'closed' }).match({ id, user_id: payload.sub })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Delete account error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    // Support listing accounts for current user
    const cookieHeader = req.headers.get('cookie') || ''
    const cookies = parseCookie(cookieHeader)
    const token = cookies['token']
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload: any = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data, error } = await supabase.from('accounts').select('*').eq('user_id', payload.sub).neq('status', 'closed').order('is_default', { ascending: false }).order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accounts: data })
  } catch (e: any) {
    console.error('List accounts error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
