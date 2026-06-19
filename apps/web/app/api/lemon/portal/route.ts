import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { reportError } from '@/lib/observability'
import { getLemonSqueezyCustomerPortalUrl } from '@/lib/payment/lemonsqueezy'
import { checkRateLimit } from '@/lib/ratelimit'

/**
 * Returns a signed LemonSqueezy customer-portal URL for the current user's
 * subscription. Read-only: it never writes entitlements (only the service-role
 * webhook may), it just hands back the hosted portal where the user can update
 * payment, cancel, or resume their plan.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const apiKey = process.env.LEMONSQUEEZY_API_KEY

    if (!url || !anonKey || !apiKey) {
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

    // 每次都打外部 LemonSqueezy API；節流避免被刷爆。
    const rl = await checkRateLimit(`portal:${user.id}`, 10)
    if (!rl.success) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: '查無訂閱資訊' }, { status: 404 })
    }

    // 只讀 subscription id；entitlements 由 webhook 寫，前端不可自助升級。
    const { data: entitlements } = await supabase
      .from('entitlements')
      .select('lemonsqueezy_subscription_id')
      .eq('user_profile_id', profile.id)
      .maybeSingle()

    const subscriptionId = entitlements?.lemonsqueezy_subscription_id
    if (!subscriptionId) {
      // 免費版或尚未有 web 訂閱（例如行動端 RevenueCat）→ 無可管理的 LemonSqueezy 訂閱。
      return NextResponse.json({ error: '沒有可管理的訂閱' }, { status: 404 })
    }

    const portalUrl = await getLemonSqueezyCustomerPortalUrl(String(subscriptionId))
    if (!portalUrl) {
      return NextResponse.json({ error: '暫時無法取得管理連結，請稍後再試' }, { status: 502 })
    }

    return NextResponse.json({ portalUrl })
  } catch (error) {
    reportError(error, { route: '/api/lemon/portal' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
