import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // 只取回應實際用到的欄位，別 select('*')：companion_activities 有多個大 JSONB／陣列欄
  // （description、required/optional_capabilities、season/holiday_tags…）回應根本不需要，
  // 全抓會放大 DB→API 記憶體與序列化成本。
  const { data: activity, error } = await supabase
    .from('companion_activities')
    .select(
      'id,title,opening_line,steps,follow_up_questions,ending_line,min_duration_minutes,max_duration_minutes,safety_notes',
    )
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: activity.id,
    title: activity.title,
    openingLine: activity.opening_line,
    steps: activity.steps || [],
    followUpQuestions: activity.follow_up_questions || [],
    endingLine: activity.ending_line,
    minDurationMinutes: activity.min_duration_minutes,
    maxDurationMinutes: activity.max_duration_minutes,
    safetyNotes: activity.safety_notes,
  })
}
