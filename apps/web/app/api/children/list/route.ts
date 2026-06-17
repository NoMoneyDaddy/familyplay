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
    // 直接查 child_profiles，交給 RLS 依「成員身分」(household_id IN my_household_ids())
    // 過濾——這樣受邀的次要成員（caregiver/viewer）也能看到共用的孩子。
    // 先前以 households.owner_id 過濾只回傳「自己擁有」的家庭，會把次要成員排除，
    // 導致邀請加入後看不到任何孩子（共同查看功能失效）。
    const { data: children, error } = await supabase
      .from('child_profiles')
      .select('id,nickname,birth_year_month,stage_key,created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch children', error)
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
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
