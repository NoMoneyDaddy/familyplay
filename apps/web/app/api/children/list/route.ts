import { ChildError, fetchChildren } from '@familyplay/data'
import { NextResponse } from 'next/server'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'
import { getApiSupabase } from '@/lib/supabase/api'

export async function GET() {
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

  const rl = await checkRateLimit(`children-list:${user.id}`, 30)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  try {
    // 收斂到 @familyplay/data 的 fetchChildren（與行動端共用）：直接查 child_profiles，
    // 交給 RLS 依「成員身分」過濾——受邀的次要成員（caregiver/viewer）也看得到共用的孩子。
    const children = await fetchChildren(supabase)
    return NextResponse.json({ children })
  } catch (error) {
    if (error instanceof ChildError) {
      reportError(error, { route: '/api/children/list', userId: user.id })
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
    }
    reportError(error, { route: '/api/children/list', userId: user.id })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
