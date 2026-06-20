import { fetchRecommendations, RecommendError } from '@familyplay/data'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

const requestSchema = z.object({
  childId: z.string().uuid(),
  parentEnergy: z.enum(['exhausted', 'low', 'medium', 'high']),
  context: z.enum(['bedtime', 'emotional_crisis', 'sick_day', 'normal']),
  availableSpace: z.enum(['anywhere', 'living_room', 'bedroom', 'outdoor', 'kitchen']),
  availableResources: z.array(z.string()).default([]),
  maxDurationMinutes: z.number().int().positive().default(30),
  // 「換一批」：硬排除已看過的活動，回傳真正不同的一組（上限避免超長 payload）。
  excludeIds: z.array(z.string().uuid()).max(120).default([]),
})

// RecommendError code → HTTP 狀態（child_not_found 維持原本英文訊息與 404）。
const ERROR_STATUS: Record<string, number> = {
  child_not_found: 404,
  age_incomplete: 400,
  age_invalid: 400,
  age_future: 400,
  activities_failed: 500,
  logs_failed: 500,
  capabilities_failed: 500,
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
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
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 30 recommendation requests per user per minute
  const rl = await checkRateLimit(`recommend:${user.id}`, 30)
  if (!rl.success) {
    return Response.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const args = requestSchema.parse(body)
    // 編排（查詢 + 七步引擎 + Step 8）共用 @familyplay/data，與行動端同一份。
    const recommendations = await fetchRecommendations(supabase, args)
    return Response.json({ recommendations })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    if (error instanceof RecommendError) {
      // 「找不到孩子」維持原本英文訊息以相容既有前端；其餘用引擎給的中文訊息。
      const message = error.code === 'child_not_found' ? 'Child not found' : error.message
      if (error.code === 'activities_failed') {
        reportError(error, { route: '/api/recommendations' })
      }
      return Response.json({ error: message }, { status: ERROR_STATUS[error.code] ?? 500 })
    }
    reportError(error, { route: '/api/recommendations' })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
