import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { verifyWebhookSignature } from '@/lib/payment/lemonsqueezy'

// LemonSqueezy sends `meta.event_name`; we read defensively.
const webhookSchema = z.object({
  meta: z.object({
    event_name: z.string().optional(),
    eventName: z.string().optional(),
    // LemonSqueezy 在 webhook 把結帳時帶的 checkout_data.custom 回傳在 meta.custom_data。
    custom_data: z.object({ userProfileId: z.string().optional() }).optional(),
  }),
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    attributes: z.object({
      status: z.string().optional(),
      variant_id: z.number().optional(),
      subscription_id: z.number().nullable().optional(),
      renews_at: z.string().nullable().optional(),
      ends_at: z.string().nullable().optional(),
    }),
  }),
})

// Events that grant/refresh an entitlement
const ACTIVATING_EVENTS = [
  'order_created',
  'order.completed',
  'subscription_created',
  'subscription_updated',
  'subscription_payment_success',
]
// Events that revoke an entitlement (downgrade to free)
const DEACTIVATING_EVENTS = [
  'subscription_cancelled',
  'subscription_expired',
  'subscription_payment_failed',
  'order_refunded',
]

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    const supporterVariantId = process.env.LEMONSQUEEZY_SUPPORTER_VARIANT_ID
    const plusVariantId = process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID

    if (!url || !serviceRoleKey || !webhookSecret || !supporterVariantId || !plusVariantId) {
      console.error('Webhook: Missing environment variables')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const rawBody = await request.text()

    // Verify HMAC signature before trusting anything
    const signature = request.headers.get('x-signature')
    if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.warn('Webhook: Invalid or missing signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let webhookData: unknown
    try {
      webhookData = JSON.parse(rawBody)
    } catch {
      // Malformed body is a client error, not a server fault — return 400 so it
      // doesn't pollute server-error monitoring.
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 })
    }
    const validated = webhookSchema.parse(webhookData)
    const eventName = validated.meta.event_name ?? validated.meta.eventName ?? ''
    const objectId = String(validated.data.id ?? '')

    const supabase = createClient(url, serviceRoleKey)

    // ── Idempotency: claim (provider, event_id) before processing ──
    // event_id combines event name + object id so a replay is a no-op.
    const eventId = `${eventName}:${objectId}`
    const { error: dedupeError } = await supabase
      .from('processed_webhooks')
      .insert({ provider: 'lemonsqueezy', event_id: eventId, event_type: eventName })

    if (dedupeError) {
      // Unique violation → already processed; ack with 200 so LS stops retrying.
      if (dedupeError.code === '23505') {
        return NextResponse.json({ success: true, deduped: true })
      }
      reportError(dedupeError, { route: '/api/lemon/webhook' })
      return NextResponse.json({ error: 'Processing error' }, { status: 500 })
    }

    // 處理失敗時釋放剛剛 claim 的 dedupe 列，否則此事件會被永久標記為「已處理」，
    // LemonSqueezy 後續重試都會走 23505 分支直接 200，升級永遠補不上（lost upgrade）。
    const releaseDedupe = () =>
      supabase
        .from('processed_webhooks')
        .delete()
        .eq('provider', 'lemonsqueezy')
        .eq('event_id', eventId)

    const isActivating = ACTIVATING_EVENTS.some((e) => eventName === e || eventName.startsWith(e))
    const isDeactivating = DEACTIVATING_EVENTS.some(
      (e) => eventName === e || eventName.startsWith(e),
    )

    if (!isActivating && !isDeactivating) {
      // Not an event we act on, but we recorded it — ack.
      return NextResponse.json({ success: true })
    }

    // webhook 的 custom data 在 meta.custom_data；舊路徑（checkout_data.custom）保留作 fallback。
    const userProfileId =
      validated.meta.custom_data?.userProfileId ??
      (
        webhookData as {
          data?: { attributes?: { checkout_data?: { custom?: { userProfileId?: string } } } }
        }
      ).data?.attributes?.checkout_data?.custom?.userProfileId
    if (!userProfileId) {
      console.error('Webhook: Missing userProfileId in custom data')
      await releaseDedupe()
      return NextResponse.json({ error: 'Missing user profile ID' }, { status: 400 })
    }

    const now = new Date()

    // ── Downgrade path ──
    if (isDeactivating) {
      // 回到 free 時把所有方案相關欄位一併清空，避免殘留舊的 plus/supporter 日期與
      // 訂閱 id，造成 UI 顯示「Plus 到期日／購買日」等矛盾資訊，或日後重訂閱時新舊資料衝突。
      const { error } = await supabase
        .from('entitlements')
        .update({
          plan: 'free',
          plus_ai_calls_remaining: 0,
          plus_ai_calls_reset_at: null,
          plus_started_at: null,
          plus_ends_at: null,
          supporter_purchased_at: null,
          lemonsqueezy_subscription_id: null,
          updated_at: now.toISOString(),
        })
        .eq('user_profile_id', userProfileId)

      if (error) {
        reportError(error, { route: '/api/lemon/webhook' })
        await releaseDedupe()
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ── Activation path: only on paid status ──
    const status = validated.data.attributes.status
    if (status && status !== 'paid' && status !== 'active') {
      return NextResponse.json({ success: true })
    }

    const variantId = validated.data.attributes.variant_id
    let plan: 'supporter' | 'plus'
    if (variantId === Number(supporterVariantId)) {
      plan = 'supporter'
    } else if (variantId === Number(plusVariantId)) {
      plan = 'plus'
    } else {
      console.error(`Webhook: Unknown variant ID ${variantId}`)
      return NextResponse.json({ error: 'Unknown plan variant' }, { status: 400 })
    }

    // Prefer the provider's billing-period end; fall back to +30d if absent or
    // if the provider sent an unparseable date (avoids RangeError on toISOString).
    const fallbackEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const providerEnd =
      validated.data.attributes.renews_at || validated.data.attributes.ends_at || null
    let plusEndsAt = fallbackEnd
    if (providerEnd) {
      const parsed = new Date(providerEnd)
      if (!Number.isNaN(parsed.getTime())) {
        plusEndsAt = parsed
      }
    }

    // 切換方案時清掉另一個方案的欄位，維持單一真實來源：
    //   supporter → 清 plus_* 欄位；plus → 清 supporter_purchased_at。
    const updateData = {
      plan,
      lemonsqueezy_subscription_id: validated.data.attributes.subscription_id ?? null,
      ...(plan === 'supporter' && {
        supporter_purchased_at: now.toISOString(),
        plus_started_at: null,
        plus_ends_at: null,
        plus_ai_calls_remaining: 0,
        plus_ai_calls_reset_at: null,
      }),
      ...(plan === 'plus' && {
        supporter_purchased_at: null,
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
      reportError(error, { route: '/api/lemon/webhook' })
      await releaseDedupe()
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Webhook: Invalid payload structure', error)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    // Don't leak internal error details to the caller
    reportError(error, { route: '/api/lemon/webhook' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
