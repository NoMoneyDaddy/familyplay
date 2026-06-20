import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { reportError } from '@/lib/observability'

export async function GET() {
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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id,display_name,avatar_url')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({
      userProfileId: null,
      displayName: user.user_metadata?.name || 'User',
      avatarUrl: null,
      householdId: null,
      role: null,
      plan: 'free',
      planStatus: 'ok',
      plusEndsAt: null,
      revenuecatCustomerId: null,
    })
  }

  // Get household membership（maybeSingle：沒有 household 是正常情況，不算錯誤）
  const { data: householdMember } = await supabase
    .from('household_members')
    .select('household_id,role')
    .eq('user_profile_id', profile.id)
    .maybeSingle()

  // Get entitlements (subscription info)。用 maybeSingle 區分「沒有列＝free」與「查詢錯誤」：
  // 真正的 DB/RLS 錯誤回 planStatus:'unknown' + plan:null，前端據此「不要把 Plus 入口藏掉」，
  // 避免短暫錯誤把 Plus 使用者誤判成 free。
  const { data: entitlements, error: entError } = await supabase
    .from('entitlements')
    .select('plan,plus_ends_at,revenuecat_customer_id')
    .eq('user_profile_id', profile.id)
    .maybeSingle()
  if (entError) reportError(entError, { route: '/api/profile#entitlements' })

  return NextResponse.json({
    // RevenueCat Web Billing 的 appUserId 用此值（= entitlements.user_profile_id，webhook 對應）。非機密。
    userProfileId: profile.id,
    displayName: profile.display_name || user.user_metadata?.name || 'User',
    avatarUrl: profile.avatar_url,
    householdId: householdMember?.household_id || null,
    role: householdMember?.role || null,
    plan: entError ? null : entitlements?.plan || 'free',
    planStatus: entError ? 'unknown' : 'ok',
    plusEndsAt: entitlements?.plus_ends_at || null,
    revenuecatCustomerId: entitlements?.revenuecat_customer_id || null,
  })
}
