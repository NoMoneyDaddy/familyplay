import { fetchHandoffs, HandoffError, saveHandoff } from '@familyplay/data'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'
import { getRequestId } from '@/lib/request-id'

// 交接小卡持久化：POST 儲存一張、GET 列出某孩子近期已儲存。
// summary_text 內容由前端即時組（不含生日等敏感資料）；household/caregiver 由 DB 推出。
const saveSchema = z.object({
  childId: z.string().uuid(),
  summaryText: z.string().min(1).max(4000),
  logsReferenced: z.array(z.string().uuid()).max(50).default([]),
})

function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
}

export async function POST(request: Request) {
  const supabase = getSupabase(await cookies())
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  const requestId = getRequestId(request)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(`handoff-write:${user.id}`, 20)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  try {
    const { childId, summaryText, logsReferenced } = saveSchema.parse(await request.json())
    const id = await saveHandoff(supabase, { childId, summaryText, logsReferenced })
    return NextResponse.json({ id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    if (error instanceof HandoffError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    reportError(error, { route: 'POST /api/handoff', userId: user.id, requestId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const supabase = getSupabase(await cookies())
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  const requestId = getRequestId(request)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = z.string().uuid().safeParse(new URL(request.url).searchParams.get('childId'))
  if (!parsed.success) return NextResponse.json({ error: 'childId 不合法' }, { status: 400 })

  try {
    const handoffs = await fetchHandoffs(supabase, parsed.data)
    return NextResponse.json({ handoffs })
  } catch (error) {
    if (error instanceof HandoffError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    reportError(error, { route: 'GET /api/handoff', userId: user.id, requestId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
