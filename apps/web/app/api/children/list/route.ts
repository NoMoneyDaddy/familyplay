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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: households } = await supabase
      .from('households')
      .select('id')
      .eq('owner_id', userProfile.id)

    if (!households || households.length === 0) {
      return NextResponse.json({ children: [] })
    }

    const householdIds = households.map((h) => h.id)

    // Fetch all children in user's households
    const { data: children, error } = await supabase
      .from('child_profiles')
      .select('id,nickname,birth_year_month,stage_key,created_at')
      .in('household_id', householdIds)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      children: (children || []).map((child) => ({
        id: child.id,
        nickname: child.nickname,
        birthYearMonth: child.birth_year_month,
        stageKey: child.stage_key,
        createdAt: child.created_at,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
