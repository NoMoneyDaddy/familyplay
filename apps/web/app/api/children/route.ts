import { ChildError, createChild } from '@familyplay/data'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

// ChildError code → HTTP 狀態
const STATUS_BY_CODE: Record<string, number> = {
  unauthorized: 401,
  profile_not_found: 404,
  profile_failed: 500,
  household_failed: 500,
  create_failed: 500,
}

const schema = z
  .object({
    nickname: z.string().min(1),
    birthYearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    // 生日精確到日（選填）。給了就必須與年月一致，避免不一致資料。
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine((d) => !d.birthDate || d.birthDate.startsWith(`${d.birthYearMonth}-`), {
    message: 'birthDate 與 birthYearMonth 不一致',
    path: ['birthDate'],
  })

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user, requestId } = auth

  const rl = await checkRateLimit(`children-create:${user.id}`, 10)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const { nickname, birthYearMonth, birthDate } = schema.parse(body)

    // 家庭歸屬解析（擁有→加入→新建）、原子 RPC＋兩段式退路、能力檔與回滾全在
    // @familyplay/data 統一處理；Web 與行動端共用同一份編排（RLS 由 client session 生效）。
    // 已驗過 user，直接傳入避免 createChild 內再打一次 supabase.auth.getUser()。
    const childId = await createChild(supabase, { nickname, birthYearMonth, birthDate, user })
    return NextResponse.json({ childId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    if (error instanceof ChildError) {
      const status = STATUS_BY_CODE[error.code] ?? 500
      // 4xx（unauthorized/profile_not_found）屬預期客戶端錯誤，不上報以免淹沒真正的系統告警。
      if (status >= 500) reportError(error, { route: '/api/children', code: error.code, requestId })
      return NextResponse.json({ error: error.message }, { status })
    }
    reportError(error, { route: '/api/children', requestId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
