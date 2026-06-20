import { ChildError, createChild } from '@familyplay/data'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

// ChildError code → HTTP 狀態
const STATUS_BY_CODE: Record<string, number> = {
  unauthorized: 401,
  profile_not_found: 404,
  household_failed: 500,
  create_failed: 500,
}

const schema = z.object({
  nickname: z.string().min(1),
  birthYearMonth: z.string().regex(/^\d{4}-\d{2}$/),
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
    const { nickname, birthYearMonth } = schema.parse(body)

    // 家庭歸屬解析（擁有→加入→新建）、原子 RPC＋兩段式退路、能力檔與回滾全在
    // @familyplay/data 統一處理；Web 與行動端共用同一份編排（RLS 由 client session 生效）。
    const childId = await createChild(supabase, { nickname, birthYearMonth })
    return NextResponse.json({ childId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    if (error instanceof ChildError) {
      reportError(error, { route: '/api/children', code: error.code })
      return NextResponse.json(
        { error: error.message },
        { status: STATUS_BY_CODE[error.code] ?? 500 },
      )
    }
    reportError(error, { route: '/api/children' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
