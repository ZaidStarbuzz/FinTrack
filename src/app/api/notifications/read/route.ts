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
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Mark notification as read only if it belongs to the user
    const { error } = await supabase.from('notifications').update({ is_read: true }).match({ id, user_id: payload.sub })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Notifications READ error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
