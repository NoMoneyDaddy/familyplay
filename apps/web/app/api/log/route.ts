import { LogError, logCompanion } from '@familyplay/data'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

const logSchema = z.object({
  childId: z.string().uuid(),
  activityId: z.string().uuid(),
  outcome: z.enum(['completed', 'tried', 'abandoned']),
  childReaction: z.enum(['happy', 'engaged', 'neutral', 'leaving', 'disinterested', 'calmed']),
  durationSecs: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(`log:${user.id}`, 30)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const params = logSchema.parse(body)

    // 寫入編排共用 @familyplay/data（household/caregiver 由 DB 推出，與行動端同一份）。
    await logCompanion(supabase, params)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    // 無效 JSON 屬客戶端錯誤（與其他 route 一致），不上報
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    if (error instanceof LogError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // 非預期 500 不再靜默：上報以利定位（風險 A）
    reportError(error, { route: '/api/log', userId: user.id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
