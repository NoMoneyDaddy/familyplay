import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  householdId: z.string().uuid(),
})

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
    const householdId = searchParams.get('householdId')

    if (!householdId) {
      return NextResponse.json({ error: 'Missing householdId parameter' }, { status: 400 })
    }

    const { householdId: validatedHouseholdId } = schema.parse({ householdId })

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', validatedHouseholdId)
      .eq('user_profile_id', userProfile.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
    }

    const { data: members, error: membersError } = await supabase
      .from('household_members')
      .select(
        `
        id,
        user_profile_id,
        role,
        nickname,
        joined_at,
        user_profiles:user_profile_id(
          id,
          display_name
        )
      `,
      )
      .eq('household_id', validatedHouseholdId)
      .order('joined_at', { ascending: true })

    if (membersError) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // 顯示名稱來源：household_members.nickname（同戶可讀）優先；display_name 受 RLS
    // 限制只讀得到自己，僅作本人後備。都沒有時用「家人」而非「Unknown User」。
    const transformedMembers = (members || []).map((member) => {
      const isSelf = member.user_profile_id === userProfile.id
      // biome-ignore lint/suspicious/noExplicitAny: Supabase relation type inference
      const displayName = member.nickname || (member.user_profiles as any)?.display_name || '家人'
      return {
        id: member.id,
        displayName,
        role: member.role,
        nickname: member.nickname || null,
        isSelf,
        joinedAt: member.joined_at,
      }
    })

    return NextResponse.json(transformedMembers)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
