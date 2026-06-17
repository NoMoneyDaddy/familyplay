import { getAgeMonths, getStageKey } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  nickname: z.string().min(1).optional(),
  birthYearMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
})

async function validateChildOwnership(
  // biome-ignore lint/suspicious/noExplicitAny: Supabase client type is complex
  supabase: any,
  childId: string,
  userProfileId: string,
): Promise<boolean> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userProfileId)
    .single()

  if (!userProfile) return false

  // Owners AND caregivers can manage children (matches the RLS policy).
  const { data: memberships } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_profile_id', userProfileId)
    .in('role', ['owner', 'caregiver'])

  if (!memberships || memberships.length === 0) return false

  // biome-ignore lint/suspicious/noExplicitAny: Supabase response type
  const householdIds = memberships.map((m: any) => m.household_id)

  const { data: child } = await supabase
    .from('child_profiles')
    .select('id')
    .eq('id', childId)
    .in('household_id', householdIds)
    .single()

  return !!child
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify ownership
    const isOwner = await validateChildOwnership(supabase, id, userProfile.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    const body = await request.json()
    const { nickname, birthYearMonth } = updateSchema.parse(body)

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic field updates
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (nickname) {
      updateData.nickname = nickname
    }

    if (birthYearMonth) {
      const ageMonths = getAgeMonths(birthYearMonth)
      const stageKey = getStageKey(ageMonths)
      updateData.birth_year_month = birthYearMonth
      updateData.stage_key = stageKey
    }

    const { data: updated, error } = await supabase
      .from('child_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update child profile', error)
      return NextResponse.json({ error: 'Failed to update child profile' }, { status: 500 })
    }

    return NextResponse.json({
      id: updated.id,
      nickname: updated.nickname,
      birthYearMonth: updated.birth_year_month,
      stageKey: updated.stage_key,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify ownership
    const isOwner = await validateChildOwnership(supabase, id, userProfile.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Soft delete by marking as inactive (if schema supports it)
    // For now, do a hard delete since the schema doesn't have an isActive field for children
    const { error } = await supabase.from('child_profiles').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete child profile', error)
      return NextResponse.json({ error: 'Failed to delete child profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
