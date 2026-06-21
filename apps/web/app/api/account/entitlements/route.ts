import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'

const entitlementsSchema = z.object({
  plan: z.enum(['free', 'supporter', 'plus']),
  supporterPurchasedAt: z.string().datetime().nullable(),
  plusStartedAt: z.string().datetime().nullable(),
  plusEndsAt: z.string().datetime().nullable(),
  plusAiCallsRemaining: z.number(),
  plusAiCallsResetAt: z.string().datetime().nullable(),
})

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

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
