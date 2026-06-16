import { createLemonSqueezyCheckout } from '@/lib/payment/lemonsqueezy'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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

    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const { planId, returnUrl } = createCheckoutSchema.parse(body)

    // Get or create user profile
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', session.session.user.id)
      .single()

    if (!profile) {
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({
          auth_user_id: session.session.user.id,
          display_name: session.session.user.user_metadata?.name || 'User',
          avatar_url: session.session.user.user_metadata?.avatar_url || null,
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
      session.session.user.email || '',
      profile.id,
      returnUrl,
    )

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
