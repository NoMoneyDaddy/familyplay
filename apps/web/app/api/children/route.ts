import { getAgeMonths, getStageKey } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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

  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { nickname, birthYearMonth } = schema.parse(body)

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', data.session.user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: household } = await supabase
      .from('households')
      .select('id')
      .eq('owner_id', userProfile.id)
      .single()

    let householdId = household?.id

    if (!householdId) {
      const { data: newHousehold } = await supabase
        .from('households')
        .insert({
          owner_id: userProfile.id,
          name: `${data.session.user.user_metadata?.name}'s Family`,
        })
        .select('id')
        .single()

      householdId = newHousehold?.id
    }

    if (!householdId) {
      return NextResponse.json({ error: 'Failed to create household' }, { status: 500 })
    }

    const ageMonths = getAgeMonths(birthYearMonth)
    const stageKey = getStageKey(ageMonths)

    const { data: child, error: childError } = await supabase
      .from('child_profiles')
      .insert({
        household_id: householdId,
        nickname,
        birth_year_month: birthYearMonth,
        stage_key: stageKey,
      })
      .select('id')
      .single()

    if (childError || !child) {
      return NextResponse.json({ error: 'Failed to create child' }, { status: 500 })
    }

    await supabase.from('child_capability_profiles').insert({
      child_id: child.id,
      capabilities: {},
    })

    return NextResponse.json({ childId: child.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
