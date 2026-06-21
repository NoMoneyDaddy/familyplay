import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

const querySchema = z.object({
  childId: z.string().uuid(),
})

// Supabase nested relation 可能回物件或陣列；安全取出 title（取代 as any）。
type ActivityRel = { title?: string | null } | { title?: string | null }[] | null | undefined
function pickTitle(rel: ActivityRel): string | null {
  const obj = Array.isArray(rel) ? rel[0] : rel
  return obj?.title ?? null
}

/**
 * Retrieves companion logs for a specified child, marked with edit permissions for the requesting user.
 *
 * Requires authentication. Returns up to 50 logs ordered by creation date (most recent first).
 * Each log includes an `editable` flag that is true only when the authenticated user is the log's caregiver.
 *
 * @returns A NextResponse containing the logs array or an error message.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user, requestId } = auth

  const rl = await checkRateLimit(`logs-read:${user.id}`, 30)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    if (!childId) {
      return NextResponse.json({ error: 'childId query parameter required' }, { status: 400 })
    }

    const { childId: validatedChildId } = querySchema.parse({ childId })

    // 三個查詢彼此獨立 → 並行，縮短回應時間
    // myProfile：目前使用者的 profile id，用來標記哪些紀錄是本人記的（可編輯／刪除）
    // child：取得所屬 household，用來解析「誰陪的」名稱（多人家庭才需要）
    const [profileResult, childResult, logsResult] = await Promise.all([
      supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single(),
      supabase.from('child_profiles').select('household_id').eq('id', validatedChildId).single(),
      supabase
        .from('companion_logs')
        .select(
          `
        id,
        caregiver_id,
        outcome,
        child_reaction,
        duration_secs,
        created_at,
        companion_activities(title)
      `,
        )
        .eq('child_id', validatedChildId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const myProfileId = profileResult.data?.id ?? null
    const { data: logs, error } = logsResult

    if (error) {
      reportError(error, {
        route: '/api/logs',
        userId: user.id,
        childId: validatedChildId,
        requestId,
      })
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // 解析陪伴者名稱：只在「多人家庭」時顯示，單人家庭一律本人、標籤只是雜訊。
    // 名稱優先用 household_members.nickname（可被同戶成員讀取）；display_name 受 RLS
    // 限制只讀得到自己，故僅作本人後備。讀失敗不影響主要紀錄回傳。
    const householdId = childResult.data?.household_id ?? null
    const memberNames = new Map<string, string>()
    let memberCount = 0
    if (householdId) {
      const { data: members } = await supabase
        .from('household_members')
        .select('user_profile_id, nickname, user_profiles:user_profile_id(display_name)')
        .eq('household_id', householdId)
      memberCount = members?.length ?? 0
      for (const m of members ?? []) {
        // Supabase nested relation 可能回物件或陣列；取 display_name 作本人後備（取代 as any）
        const up = m.user_profiles as
          | { display_name?: string | null }
          | { display_name?: string | null }[]
          | null
        const displayName = (Array.isArray(up) ? up[0] : up)?.display_name
        const name = m.nickname || displayName || null
        if (name) memberNames.set(m.user_profile_id, name)
      }
    }
    const shared = memberCount > 1

    return NextResponse.json({
      logs: (logs || []).map((log) => {
        const byMe = myProfileId != null && log.caregiver_id === myProfileId
        return {
          id: log.id,
          activityTitle: pickTitle(log.companion_activities) || 'Unknown Activity',
          outcome: log.outcome,
          childReaction: log.child_reaction,
          createdAt: log.created_at,
          durationSecs: log.duration_secs,
          // 只有本人記的紀錄能改／刪（與 RLS log_owner_update/delete 一致）
          editable: byMe,
          // 多人家庭才標「誰陪的」：本人顯示「你」，其餘用暱稱、未設則「家人」
          caregiverName: shared
            ? byMe
              ? '你'
              : (log.caregiver_id && memberNames.get(log.caregiver_id)) || '家人'
            : null,
        }
      }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    reportError(error, { route: '/api/logs', userId: user.id, requestId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
