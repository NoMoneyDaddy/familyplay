import { ChildError, fetchChildren } from '@familyplay/data'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { supabase, user, requestId } = auth

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
      reportError(error, { route: '/api/children/list', userId: user.id, requestId })
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
    }
    reportError(error, { route: '/api/children/list', userId: user.id, requestId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
