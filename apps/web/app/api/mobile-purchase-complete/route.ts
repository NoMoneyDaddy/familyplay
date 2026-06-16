import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validate mobile purchase request
const MobilePurchaseSchema = z.object({
  revenuecatCustomerId: z.string().min(1, 'RevenueCat customer ID is required'),
  authUserId: z.string().uuid('Invalid auth user ID'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  productId: z.enum([
    'com.familyplay.supporter.monthly',
    'com.familyplay.plus.monthly',
    'com.familyplay.plus.yearly',
    'familyplay_supporter_monthly',
    'familyplay_plus_monthly',
    'familyplay_plus_yearly',
  ]),
  purchaseDate: z.string().datetime(),
})

type MobilePurchase = z.infer<typeof MobilePurchaseSchema>

// Map product IDs to plan types
const PRODUCT_TO_PLAN: Record<string, 'supporter' | 'plus'> = {
  'com.familyplay.supporter.monthly': 'supporter',
  'com.familyplay.plus.monthly': 'plus',
  'com.familyplay.plus.yearly': 'plus',
  familyplay_supporter_monthly: 'supporter',
  familyplay_plus_monthly: 'plus',
  familyplay_plus_yearly: 'plus',
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    let purchase: MobilePurchase

    try {
      purchase = MobilePurchaseSchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationError instanceof z.ZodError ? validationError.errors : [],
        },
        { status: 400 },
      )
    }

    // Get auth session from request
    const cookieStore = await cookies()
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const { data: session } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user ID matches the authenticated user
    if (session.user.id !== purchase.authUserId) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', purchase.authUserId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Determine plan from product ID
    const plan = PRODUCT_TO_PLAN[purchase.productId]
    if (!plan) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    // Calculate subscription end date (30 days from now for monthly)
    // In production, this should come from RevenueCat webhook verification
    const plusEndsAt = new Date()
    plusEndsAt.setDate(plusEndsAt.getDate() + 30)

    // Check if entitlements record already exists
    const { data: existingEntitlements } = await supabase
      .from('entitlements')
      .select('id')
      .eq('user_profile_id', userProfile.id)
      .single()

    // Upsert entitlements record with idempotency check
    if (existingEntitlements) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('entitlements')
        .update({
          plan,
          revenuecat_customer_id: purchase.revenuecatCustomerId,
          plus_started_at:
            plan === 'plus' ? new Date(purchase.purchaseDate).toISOString() : undefined,
          plus_ends_at: plan === 'plus' ? plusEndsAt.toISOString() : undefined,
          supporter_purchased_at:
            plan === 'supporter' ? new Date(purchase.purchaseDate).toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('user_profile_id', userProfile.id)
        .select()
        .single()

      if (updateError || !updated) {
        console.error('[mobile-purchase-complete] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update entitlements' }, { status: 500 })
      }

      return NextResponse.json({
        plan: updated.plan,
        plusEndsAt: updated.plus_ends_at,
        revenuecatCustomerId: updated.revenuecat_customer_id,
      })
    }
    // Create new entitlements record
    const { data: created, error: createError } = await supabase
      .from('entitlements')
      .insert({
        user_profile_id: userProfile.id,
        plan,
        revenuecat_customer_id: purchase.revenuecatCustomerId,
        plus_started_at: plan === 'plus' ? new Date(purchase.purchaseDate).toISOString() : null,
        plus_ends_at: plan === 'plus' ? plusEndsAt.toISOString() : null,
        supporter_purchased_at:
          plan === 'supporter' ? new Date(purchase.purchaseDate).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError || !created) {
      console.error('[mobile-purchase-complete] Insert error:', createError)
      return NextResponse.json({ error: 'Failed to create entitlements' }, { status: 500 })
    }

    return NextResponse.json({
      plan: created.plan,
      plusEndsAt: created.plus_ends_at,
      revenuecatCustomerId: created.revenuecat_customer_id,
    })
  } catch (error) {
    console.error('[mobile-purchase-complete] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
