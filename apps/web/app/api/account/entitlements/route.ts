import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const entitlementsSchema = z.object({
  plan: z.enum(['free', 'supporter', 'plus']),
  supporterPurchasedAt: z.string().datetime().nullable(),
  plusStartedAt: z.string().datetime().nullable(),
  plusEndsAt: z.string().datetime().nullable(),
  plusAiCallsRemaining: z.number(),
  plusAiCallsResetAt: z.string().datetime().nullable(),
})

export async function GET() {
  try {
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

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        {
          plan: 'free',
          supporterPurchasedAt: null,
          plusStartedAt: null,
          plusEndsAt: null,
          plusAiCallsRemaining: 0,
          plusAiCallsResetAt: null,
        },
        { status: 200 },
      )
    }

    // Get entitlements
    const { data: entitlements } = await supabase
      .from('entitlements')
      .select(
        'plan,supporter_purchased_at,plus_started_at,plus_ends_at,plus_ai_calls_remaining,plus_ai_calls_reset_at',
      )
      .eq('user_profile_id', profile.id)
      .single()

    if (!entitlements) {
      return NextResponse.json(
        {
          plan: 'free',
          supporterPurchasedAt: null,
          plusStartedAt: null,
          plusEndsAt: null,
          plusAiCallsRemaining: 0,
          plusAiCallsResetAt: null,
        },
        { status: 200 },
      )
    }

    const result = {
      plan: entitlements.plan as 'free' | 'supporter' | 'plus',
      supporterPurchasedAt: entitlements.supporter_purchased_at,
      plusStartedAt: entitlements.plus_started_at,
      plusEndsAt: entitlements.plus_ends_at,
      plusAiCallsRemaining: entitlements.plus_ai_calls_remaining ?? 0,
      plusAiCallsResetAt: entitlements.plus_ai_calls_reset_at,
    }

    // Validate response shape
    const validated = entitlementsSchema.parse(result)

    return NextResponse.json(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Entitlements validation error:', error)
      return NextResponse.json({ error: 'Invalid entitlements data' }, { status: 500 })
    }

    console.error('Entitlements fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
