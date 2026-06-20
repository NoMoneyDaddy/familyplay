import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import {
  classifyEvent,
  type PlanConfig,
  planFromEvent,
  resolveExpiry,
  verifyRevenueCatAuth,
} from '@/lib/payment/revenuecat'

export const runtime = 'nodejs'

// RevenueCat 統一收費 webhook（行動端 IAP + Web Billing 共用）。
// entitlements 只由此（service-role）寫，前端不可自助升級。
const webhookSchema = z.object({
  event: z.object({
    type: z.string(),
    id: z.union([z.string(), z.number()]).transform(String),
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    product_id: z.string().optional(),
    entitlement_ids: z.array(z.string()).nullable().optional(),
    expiration_at_ms: z.number().nullable().optional(),
    purchased_at_ms: z.number().nullable().optional(),
  }),
})

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const authSecret = process.env.REVENUECAT_WEBHOOK_AUTH

    if (!url || !serviceRoleKey || !authSecret) {
      console.error('RevenueCat webhook: Missing environment variables')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // 驗證 Authorization（RevenueCat 後台設定的固定值）
    if (!verifyRevenueCatAuth(request.headers.get('authorization'), authSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 })
    }
    const { event } = webhookSchema.parse(raw)

    const action = classifyEvent(event.type)
    const supabase = createClient(url, serviceRoleKey)

    // ── Idempotency：先 claim (provider, event_id) 再處理，重送即 no-op ──
    const eventId = `${event.type}:${event.id}`
    const { error: dedupeError } = await supabase
      .from('processed_webhooks')
      .insert({ provider: 'revenuecat', event_id: eventId, event_type: event.type })

    if (dedupeError) {
      if (dedupeError.code === '23505') {
        return NextResponse.json({ success: true, deduped: true })
      }
      reportError(dedupeError, { route: '/api/revenuecat/webhook' })
      return NextResponse.json({ error: 'Processing error' }, { status: 500 })
    }

    // 處理失敗時釋放 dedupe 列，否則此事件被永久標記已處理 → 升級永遠補不上。
    const releaseDedupe = () =>
      supabase
        .from('processed_webhooks')
        .delete()
        .eq('provider', 'revenuecat')
        .eq('event_id', eventId)

    if (action === 'ignore') {
      // 已記錄但不需動作（例如 CANCELLATION：關閉續訂、仍可用到到期）
      return NextResponse.json({ success: true })
    }

    // app_user_id 在設定 SDK 時設為 user_profile_id；缺漏無法對應 → 釋放並回 400。
    const userProfileId = event.app_user_id
    if (!userProfileId) {
      await releaseDedupe()
      return NextResponse.json({ error: 'Missing app_user_id' }, { status: 400 })
    }

    const now = new Date()

    // ── 撤銷（EXPIRATION）→ 回 free，清空所有方案欄位 ──
    if (action === 'deactivate') {
      const { error } = await supabase
        .from('entitlements')
        .update({
          plan: 'free',
          plus_ai_calls_remaining: 0,
          plus_ai_calls_reset_at: null,
          plus_started_at: null,
          plus_ends_at: null,
          supporter_purchased_at: null,
          updated_at: now.toISOString(),
        })
        .eq('user_profile_id', userProfileId)
      if (error) {
        reportError(error, { route: '/api/revenuecat/webhook' })
        await releaseDedupe()
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ── 啟用 ──
    const config: PlanConfig = {
      supporterEntitlement: process.env.REVENUECAT_SUPPORTER_ENTITLEMENT || 'supporter',
      plusEntitlement: process.env.REVENUECAT_PLUS_ENTITLEMENT || 'plus',
      supporterProductIds: (process.env.REVENUECAT_SUPPORTER_PRODUCT_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      plusProductIds: (process.env.REVENUECAT_PLUS_PRODUCT_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    const plan = planFromEvent(event, config)
    if (!plan) {
      console.error(`RevenueCat webhook: cannot map event to plan (${event.product_id})`)
      await releaseDedupe()
      return NextResponse.json({ error: 'Unknown product/entitlement' }, { status: 400 })
    }

    const plusEndsAt = resolveExpiry(event.expiration_at_ms)
    // upsert：行動端 IAP 不經我們的 checkout 端點，entitlements 列可能尚未存在。
    const { error } = await supabase.from('entitlements').upsert(
      {
        user_profile_id: userProfileId,
        plan,
        revenuecat_customer_id: event.original_app_user_id || userProfileId,
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
      },
      { onConflict: 'user_profile_id' },
    )
    if (error) {
      reportError(error, { route: '/api/revenuecat/webhook' })
      await releaseDedupe()
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    reportError(error, { route: '/api/revenuecat/webhook' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
