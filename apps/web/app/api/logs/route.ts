import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: logs, error } = await supabase
    .from('companion_logs')
    .select(
      `
      id,
      outcome,
      child_reaction,
      duration_secs,
      created_at,
      companion_activities(title)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: (logs || []).map((log) => ({
      id: log.id,
      activityTitle: (log.companion_activities as any)?.title || 'Unknown Activity',
      outcome: log.outcome,
      childReaction: log.child_reaction,
      createdAt: log.created_at,
      durationSecs: log.duration_secs,
    })),
  })
}
