import { fetchGrowth, GrowthError, recordGrowth } from '@familyplay/data'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

// 成長紀錄（身高/體重/頭圍）。GET 列出某孩子的量測（新到舊）、POST 新增一筆。
// household 歸屬與寫入角色由 RLS 把關；created_by 由 @familyplay/data 從 DB 推出。

// 量測值合理範圍（與 migration 的 CHECK 一致，提前擋）。空字串/未填 → null。
const metric = (max: number) =>
  z
    .union([z.number().positive().lt(max), z.null()])
    .optional()
    .transform((v) => v ?? null)

const postSchema = z
  .object({
    measuredOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    heightCm: metric(200),
    weightKg: metric(100),
    headCircCm: metric(100),
  })
  .refine((d) => d.heightCm != null || d.weightKg != null || d.headCircCm != null, {
    message: '至少要填一個量測值',
  })

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'childId 不合法' }, { status: 400 })
  }
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user, requestId } = auth

  const rl = await checkRateLimit(`growth-read:${user.id}`, 60)
  if (!rl.success) return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })

  try {
    const measurements = await fetchGrowth(supabase, id)
    return NextResponse.json({ measurements })
  } catch (error) {
    if (error instanceof GrowthError) {
      return NextResponse.json({ error: '無法載入成長紀錄' }, { status: 500 })
    }
    reportError(error, {
      route: 'GET /api/children/[id]/growth',
      userId: user.id,
      childId: id,
      requestId,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'childId 不合法' }, { status: 400 })
  }
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user, requestId } = auth

  const rl = await checkRateLimit(`growth-write:${user.id}`, 30)
  if (!rl.success) return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '輸入不合法', details: parsed.error.errors }, { status: 400 })
  }

  try {
    const newId = await recordGrowth(supabase, { childId: id, ...parsed.data })
    return NextResponse.json({ id: newId })
  } catch (error) {
    if (error instanceof GrowthError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    reportError(error, {
      route: 'POST /api/children/[id]/growth',
      userId: user.id,
      childId: id,
      requestId,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
