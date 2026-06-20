import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiSupabase } from '@/lib/supabase/api'

const schema = z.object({
  householdId: z.string().uuid(),
})

export async function GET(request: Request) {
  const supabase = await getApiSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

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
      // Supabase nested relation 可能回物件或陣列；取 display_name 作後備（取代 as any）
      const up = member.user_profiles as
        | { display_name?: string | null }
        | { display_name?: string | null }[]
        | null
      const displayName =
        member.nickname || (Array.isArray(up) ? up[0] : up)?.display_name || '家人'
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
