import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  childId: z.string().uuid(),
})

/**
 * Retrieves companion logs for a specified child, marked with edit permissions for the requesting user.
 *
 * Requires authentication. Returns up to 50 logs ordered by creation date (most recent first).
 * Each log includes an `editable` flag that is true only when the authenticated user is the log's caregiver.
 *
 * @returns A NextResponse containing the logs array or an error message.
 */
export async function GET(request: Request) {
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

  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    if (!childId) {
      return NextResponse.json({ error: 'childId query parameter required' }, { status: 400 })
    }

    const { childId: validatedChildId } = querySchema.parse({ childId })

    // 目前使用者的 profile id —— 用來標記哪些紀錄是本人記的（可編輯／刪除）
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    const myProfileId = myProfile?.id ?? null

    const { data: logs, error } = await supabase
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
      .limit(50)

    if (error) {
      console.error('Failed to fetch logs', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    return NextResponse.json({
      logs: (logs || []).map((log) => ({
        id: log.id,
        // biome-ignore lint/suspicious/noExplicitAny: Supabase relation type inference
        activityTitle: (log.companion_activities as any)?.title || 'Unknown Activity',
        outcome: log.outcome,
        childReaction: log.child_reaction,
        createdAt: log.created_at,
        durationSecs: log.duration_secs,
        // 只有本人記的紀錄能改／刪（與 RLS log_owner_update/delete 一致）
        editable: myProfileId != null && log.caregiver_id === myProfileId,
      })),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
