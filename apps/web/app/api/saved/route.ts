import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({ activityId: z.string().uuid() })

// 個人收藏（save for later）：綁 user_profile，RLS 僅本人可讀寫。
function getSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
}

async function resolveProfileId(
  supabase: ReturnType<typeof createServerClient>,
  authUserId: string,
) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()
  return data?.id as string | undefined
}

// 列出收藏（含活動內容），新到舊。
export async function GET() {
  const supabase = getSupabase(await cookies())
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('saved_activities')
    .select(
      'activity_id, created_at, companion_activities(id, title, min_duration_minutes, max_duration_minutes, stimulation_level, developmental_focus)',
    )
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to load saved' }, { status: 500 })
  return NextResponse.json({ saved: data ?? [] })
}

// 收藏一個活動（重複收藏視為成功，靠 UNIQUE 去重）。
export async function POST(request: Request) {
  const supabase = getSupabase(await cookies())
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let activityId: string
  try {
    activityId = bodySchema.parse(await request.json()).activityId
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const profileId = await resolveProfileId(supabase, user.id)
  if (!profileId) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

  const { error } = await supabase
    .from('saved_activities')
    .upsert(
      { user_profile_id: profileId, activity_id: activityId },
      { onConflict: 'user_profile_id,activity_id', ignoreDuplicates: true },
    )
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  return NextResponse.json({ saved: true })
}

// 取消收藏。RLS 已限制只能刪自己的，仍顯式比對 activity_id。
export async function DELETE(request: Request) {
  const supabase = getSupabase(await cookies())
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const activityId = new URL(request.url).searchParams.get('activityId')
  if (!activityId || !z.string().uuid().safeParse(activityId).success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await supabase.from('saved_activities').delete().eq('activity_id', activityId)
  if (error) return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  return NextResponse.json({ saved: false })
}
