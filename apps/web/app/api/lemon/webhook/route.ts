import { verifyWebhookSignature } from '@/lib/payment/lemonsqueezy'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const webhookSchema = z.object({
  meta: z.object({
    eventName: z.string(),
  }),
  data: z.object({
    attributes: z.object({
      status: z.string(),
      variant_id: z.number(),
      subscription_id: z.number().nullable().optional(),
    }),
  }),
})

export async function POST(request: Request) {
  try {
    // Validate environment
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    const supporterVariantId = process.env.LEMONSQUEEZY_SUPPORTER_VARIANT_ID
    const plusVariantId = process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID

    if (!url || !serviceRoleKey || !webhookSecret || !supporterVariantId || !plusVariantId) {
      console.error('Webhook: Missing environment variables')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature
    const signature = request.headers.get('x-signature')
    if (!signature) {
      console.warn('Webhook: Missing x-signature header')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.warn('Webhook: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse and validate webhook body
    const webhookData = JSON.parse(rawBody)
    const validated = webhookSchema.parse(webhookData)

    // Only process completed orders
    if (
      validated.meta.eventName !== 'order.completed' ||
      validated.data.attributes.status !== 'paid'
    ) {
      return NextResponse.json({ success: true })
    }

    // Extract metadata from webhook
    const variantId = validated.data.attributes.variant_id
    const subscriptionId = validated.data.attributes.subscription_id

    // Get checkout custom data for user profile ID
    const customData = webhookData.data?.attributes?.checkout_data?.custom
    const userProfileId = customData?.userProfileId

    if (!userProfileId) {
      console.error('Webhook: Missing userProfileId in custom data')
      return NextResponse.json({ error: 'Missing user profile ID' }, { status: 400 })
    }

    // Determine plan type from variant ID
    let plan: 'supporter' | 'plus'
    if (variantId === Number(supporterVariantId)) {
      plan = 'supporter'
    } else if (variantId === Number(plusVariantId)) {
      plan = 'plus'
    } else {
      console.error(`Webhook: Unknown variant ID ${variantId}`)
      return NextResponse.json({ error: 'Unknown plan variant' }, { status: 400 })
    }

    // Create service role client for secure updates
    const supabase = createClient(url, serviceRoleKey)

    // Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from('entitlements')
      .select('id,lemonsqueezy_subscription_id')
      .eq('user_profile_id', userProfileId)
      .single()

    if (existing?.lemonsqueezy_subscription_id === subscriptionId && subscriptionId) {
      return NextResponse.json({ success: true })
    }

    // Update entitlements
    const now = new Date()
    const plusEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const updateData = {
      plan,
      lemonsqueezy_subscription_id: subscriptionId,
      ...(plan === 'supporter' && { supporter_purchased_at: now.toISOString() }),
      ...(plan === 'plus' && {
        plus_started_at: now.toISOString(),
        plus_ends_at: plusEndsAt.toISOString(),
        plus_ai_calls_remaining: 100,
        plus_ai_calls_reset_at: plusEndsAt.toISOString(),
      }),
      updated_at: now.toISOString(),
    }

    const { error } = await supabase
      .from('entitlements')
      .update(updateData)
      .eq('user_profile_id', userProfileId)

    if (error) {
      console.error('Webhook: Database update failed', error)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Webhook: Invalid payload structure', error)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.error('Webhook: Unexpected error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
