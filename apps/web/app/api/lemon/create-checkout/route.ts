import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { createLemonSqueezyCheckout } from '@/lib/payment/lemonsqueezy'
import { checkRateLimit } from '@/lib/ratelimit'

const createCheckoutSchema = z.object({
  planId: z.enum(['supporter', 'plus']),
  returnUrl: z.string().url().optional(),
})

export async function POST(request: Request) {
  try {
    // Validate environment
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supporterVariantId = process.env.LEMONSQUEEZY_SUPPORTER_VARIANT_ID
    const plusVariantId = process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID

    if (!url || !anonKey || !supporterVariantId || !plusVariantId) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Get authenticated user
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

    // 每次結帳都打外部 LemonSqueezy API；節流避免被刷爆。
    const rl = await checkRateLimit(`checkout:${user.id}`, 10)
    if (!rl.success) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
    }

    // Validate request body
    const body = await request.json()
    const { planId, returnUrl } = createCheckoutSchema.parse(body)

    // Get or create user profile
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({
          auth_user_id: user.id,
          display_name: user.user_metadata?.name || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select('id')
        .single()

      if (!newProfile) {
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      profile = newProfile
    }

    // Ensure entitlements record exists
    const { data: existingEntitlement } = await supabase
      .from('entitlements')
      .select('id')
      .eq('user_profile_id', profile.id)
      .single()

    if (!existingEntitlement) {
      await supabase.from('entitlements').insert({
        user_profile_id: profile.id,
        plan: 'free',
      })
    }

    // Determine variant ID
    const variantId = planId === 'supporter' ? Number(supporterVariantId) : Number(plusVariantId)

    // Create LemonSqueezy checkout
    const checkoutUrl = await createLemonSqueezyCheckout(
      variantId,
      user.email || '',
      profile.id,
      returnUrl,
    )

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    reportError(error, { route: '/api/lemon/create-checkout' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
