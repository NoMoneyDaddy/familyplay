import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
      displayName: user.user_metadata?.name || 'User',
      avatarUrl: null,
      householdId: null,
      role: null,
      plan: 'free',
      plusEndsAt: null,
      revenuecatCustomerId: null,
    })
  }

  // Get household membership
  const { data: householdMember } = await supabase
    .from('household_members')
    .select('household_id,role')
    .eq('user_profile_id', profile.id)
    .single()

  // Get entitlements (subscription info)
  const { data: entitlements } = await supabase
    .from('entitlements')
    .select('plan,plus_ends_at,revenuecat_customer_id')
    .eq('user_profile_id', profile.id)
    .single()

  return NextResponse.json({
    displayName: profile.display_name || user.user_metadata?.name || 'User',
    avatarUrl: profile.avatar_url,
    householdId: householdMember?.household_id || null,
    role: householdMember?.role || null,
    plan: entitlements?.plan || 'free',
    plusEndsAt: entitlements?.plus_ends_at || null,
    revenuecatCustomerId: entitlements?.revenuecat_customer_id || null,
  })
}
