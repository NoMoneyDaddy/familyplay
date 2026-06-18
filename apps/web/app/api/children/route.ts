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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { nickname, birthYearMonth } = schema.parse(body)

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 找使用者要把孩子加進的家庭：
    //   1) 優先用自己「擁有」的家庭
    //   2) 否則用自己「以成員身分加入」的家庭——受邀的 caregiver 也能往共用家庭新增孩子，
    //      而不是被迫另開新家庭，這樣家人才是真的「共同」管理同一批孩子
    //   3) 都沒有才新建一個自己擁有的家庭
    const { data: ownedHousehold, error: ownedError } = await supabase
      .from('households')
      .select('id')
      .eq('owner_id', userProfile.id)
      .maybeSingle()

    // 查詢失敗（RLS/網路/暫時性錯誤）時必須中止——否則會誤判「沒有家庭」而誤建重複家庭
    if (ownedError) {
      return NextResponse.json({ error: 'Failed to look up household' }, { status: 500 })
    }

    let householdId = ownedHousehold?.id

    if (!householdId) {
      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_profile_id', userProfile.id)
        .limit(1)
        .maybeSingle()
      if (membershipError) {
        return NextResponse.json({ error: 'Failed to look up membership' }, { status: 500 })
      }
      householdId = membership?.household_id
    }

    if (!householdId) {
      const { data: newHousehold, error: createHouseholdError } = await supabase
        .from('households')
        .insert({
          owner_id: userProfile.id,
          name: `${user.user_metadata?.name ?? '我'}的家庭`,
        })
        .select('id')
        .single()

      if (createHouseholdError) {
        console.error('Failed to create household:', createHouseholdError)
      }
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

    // 能力 profile 是 ZPD 推薦的前提；先前忽略此 insert 的錯誤 → 孩子可能存在卻無
    // 能力檔，推薦靜默降級。檢查錯誤，失敗就回滾剛建立的孩子，避免半套資料。
    const { error: capError } = await supabase.from('child_capability_profiles').insert({
      child_id: child.id,
      capabilities: {},
    })

    if (capError) {
      console.error('Failed to create child capability profile:', capError)
      const { error: rollbackError } = await supabase
        .from('child_profiles')
        .delete()
        .eq('id', child.id)
      if (rollbackError) {
        console.error('Failed to rollback child profile creation:', rollbackError)
      }
      return NextResponse.json({ error: 'Failed to create child' }, { status: 500 })
    }

    return NextResponse.json({ childId: child.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
