import { fetchStreak, fetchWeeklyInsights, type WeeklyInsights } from '@familyplay/data'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'

/**
 * GET /api/insights?childId=...
 * 回傳某孩子的連續陪伴天數與本週洞察（情感回饋）。次要資訊：streak/insights 任一失敗
 * 各自回退（0 / null），不讓整個回應失敗。RLS 由 client 帶 session 生效。
 */
const querySchema = z.object({ childId: z.string().uuid() })

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

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
