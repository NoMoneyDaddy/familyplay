import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1),
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
    const { code } = schema.parse(body)

    // Get current user's profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', data.session.user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Find the invite by token
    const { data: invite } = await supabase
      .from('household_invites')
      .select('id,household_id,role,expires_at,used_at')
      .eq('token', code)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check if invite has already been used
    if (invite.used_at) {
      return NextResponse.json({ error: 'Invite has already been used' }, { status: 400 })
    }

    // Check if user is already a member of this household
    const { data: existingMembership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', invite.household_id)
      .eq('user_profile_id', userProfile.id)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this household' },
        { status: 400 },
      )
    }

    // Add user to household_members with the role from the invite
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .insert({
        household_id: invite.household_id,
        user_profile_id: userProfile.id,
        role: invite.role,
        joined_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Failed to add user to household' },
        { status: 500 },
      )
    }

    // Mark invite as used
    const { error: updateError } = await supabase
      .from('household_invites')
      .update({
        used_at: new Date().toISOString(),
        used_by: userProfile.id,
      })
      .eq('id', invite.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to mark invite as used' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      householdId: invite.household_id,
      message: 'Successfully joined household',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
