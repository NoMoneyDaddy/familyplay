import { fetchStreak, fetchWeeklyInsights, type WeeklyInsights } from '@familyplay/data'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'

/**
 * GET /api/insights?childId=...
 * 回傳某孩子的連續陪伴天數與本週洞察（情感回饋）。次要資訊：streak/insights 任一失敗
 * 各自回退（0 / null），不讓整個回應失敗。RLS 由 client 帶 session 生效。
 */
const querySchema = z.object({ childId: z.string().uuid() })

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = querySchema.safeParse({
    childId: new URL(request.url).searchParams.get('childId'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'childId 不合法' }, { status: 400 })
  }

  const { childId } = parsed.data
  const [streak, weekly] = await Promise.all([
    fetchStreak(supabase, { childId }).catch((e) => {
      reportError(e, { route: '/api/insights#streak' })
      return 0
    }),
    fetchWeeklyInsights(supabase, { childId }).catch((e): WeeklyInsights | null => {
      reportError(e, { route: '/api/insights#weekly' })
      return null
    }),
  ])

  return NextResponse.json({ streak, weekly })
}
