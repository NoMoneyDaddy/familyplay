import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const logSchema = z.object({
  childId: z.string().uuid(),
  activityId: z.string().uuid(),
  outcome: z.enum(['completed', 'tried', 'abandoned']),
  childReaction: z.enum(['happy', 'engaged', 'neutral', 'leaving', 'disinterested', 'calmed']),
  durationSecs: z.number().int().positive().optional(),
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

  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { childId, activityId, outcome, childReaction, durationSecs } = logSchema.parse(body)

    const { data: child } = await supabase
      .from('child_profiles')
      .select('household_id')
      .eq('id', childId)
      .single()

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', data.session.user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { error: insertError } = await supabase.from('companion_logs').insert({
      child_id: childId,
      household_id: child.household_id,
      activity_id: activityId,
      caregiver_id: userProfile.id,
      outcome,
      child_reaction: childReaction,
      duration_secs: durationSecs,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
