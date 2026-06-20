import { LogError, logCompanion } from '@familyplay/data'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'
import { getRequestId } from '@/lib/request-id'
import { getApiSupabase } from '@/lib/supabase/api'

const logSchema = z.object({
  childId: z.string().uuid(),
  activityId: z.string().uuid(),
  outcome: z.enum(['completed', 'tried', 'abandoned']),
  childReaction: z.enum(['happy', 'engaged', 'neutral', 'leaving', 'disinterested', 'calmed']),
  durationSecs: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  // userId 先宣告在 try 外：讓 auth/限流階段的非預期錯誤也能在 catch 帶上（可能尚未取得）。
  let userId: string | undefined
  const requestId = getRequestId(request)
  // 整個處理包進 try：連 cookies()/getUser()/checkRateLimit() 的非預期錯誤（Supabase/Redis
  // 故障）也走 catch 上報，不再靜默 500（風險 A）。
  try {
    const supabase = await getApiSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    const rl = await checkRateLimit(`log:${user.id}`, 30)
    if (!rl.success) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
    }

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
    // 非預期 500 不再靜默：上報以利定位（風險 A）。userId 可能尚未取得（auth 階段就出錯）。
    reportError(error, { route: '/api/log', userId, requestId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
