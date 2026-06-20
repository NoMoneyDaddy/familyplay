import { beforeEach, describe, expect, it, vi } from 'vitest'

// RevenueCat webhook route handler 整合測試（白皮書風險 B）：驗證簽章、等冪 claim、
// 失敗釋放 dedupe、方案啟用/撤銷的 entitlements 寫入、各種 ack 取捨。
// 保留真實的 revenuecat.ts 純函式（verifyRevenueCatAuth/classifyEvent/planFromEvent），
// 只 mock supabase 與上報。

const db = vi.hoisted(() => ({
  dedupeInsertError: null as null | { code?: string; message?: string },
  entitlementError: null as null | { message: string },
  released: false,
  upserted: null as Record<string, unknown> | null,
  updated: null as Record<string, unknown> | null,
}))
const reportError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/observability', () => ({ reportError }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from(table: string) {
      if (table === 'processed_webhooks') {
        return {
          insert: async () => ({ error: db.dedupeInsertError }),
          delete: () => ({
            eq: () => ({
              eq: async () => {
                db.released = true
                return { error: null }
              },
            }),
          }),
        }
      }
      // entitlements
      return {
        update: (payload: Record<string, unknown>) => {
          db.updated = payload
          return { eq: async () => ({ error: db.entitlementError }) }
        },
        upsert: async (payload: Record<string, unknown>) => {
          db.upserted = payload
          return { error: db.entitlementError }
        },
      }
    },
  }),
}))

import { POST } from '../app/api/revenuecat/webhook/route'

const AUTH = 'test-secret'
const UUID = '11111111-1111-4111-8111-111111111111'

interface EventInput {
  type: string
  id?: string | number
  app_user_id?: string
  entitlement_ids?: string[] | null
  expiration_at_ms?: number | null
  product_id?: string
}

function post(event: EventInput | null, opts: { auth?: string | null; rawBody?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const auth = 'auth' in opts ? opts.auth : AUTH
  if (auth != null) headers.authorization = auth
  return new Request('http://localhost/api/revenuecat/webhook', {
    method: 'POST',
    headers,
    body: opts.rawBody ?? JSON.stringify(event ? { event: { id: 'e1', ...event } } : {}),
  })
}

beforeEach(() => {
  db.dedupeInsertError = null
  db.entitlementError = null
  db.released = false
  db.upserted = null
  db.updated = null
  reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
  vi.stubEnv('REVENUECAT_WEBHOOK_AUTH', AUTH)
  vi.stubEnv('REVENUECAT_SUPPORTER_ENTITLEMENT', 'supporter')
  vi.stubEnv('REVENUECAT_PLUS_ENTITLEMENT', 'plus')
})

describe('POST /api/revenuecat/webhook', () => {
  it('缺環境變數 → 500', async () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_AUTH', '')
    const res = await POST(post({ type: 'INITIAL_PURCHASE' }))
    expect(res.status).toBe(500)
  })

  it('簽章不符 → 401', async () => {
    const res = await POST(post({ type: 'INITIAL_PURCHASE' }, { auth: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('無效 JSON → 400', async () => {
    const res = await POST(post(null, { rawBody: 'not-json' }))
    expect(res.status).toBe(400)
  })

  it('payload schema 不合法 → 400', async () => {
    const res = await POST(post(null, { rawBody: JSON.stringify({ event: {} }) }))
    expect(res.status).toBe(400)
  })

  it('重複事件（dedupe 23505）→ 200 deduped、不釋放', async () => {
    db.dedupeInsertError = { code: '23505' }
    const res = await POST(post({ type: 'INITIAL_PURCHASE', app_user_id: UUID }))
    expect(res.status).toBe(200)
    expect((await res.json()).deduped).toBe(true)
    expect(db.released).toBe(false)
  })

  it('dedupe 其他錯誤 → 500 並上報', async () => {
    db.dedupeInsertError = { code: '42P01', message: 'boom' }
    const res = await POST(post({ type: 'INITIAL_PURCHASE', app_user_id: UUID }))
    expect(res.status).toBe(500)
    expect(reportError).toHaveBeenCalled()
  })

  it('ignore 類事件（CANCELLATION）→ 200、completed 不釋放', async () => {
    const res = await POST(post({ type: 'CANCELLATION', app_user_id: UUID }))
    expect(res.status).toBe(200)
    expect(db.released).toBe(false)
  })

  it('啟用但缺 app_user_id → 400 並釋放 dedupe', async () => {
    const res = await POST(post({ type: 'INITIAL_PURCHASE' }))
    expect(res.status).toBe(400)
    expect(db.released).toBe(true)
  })

  it('非 UUID 的匿名 app_user_id → 200 skipped、不釋放（避免重試風暴）', async () => {
    const res = await POST(post({ type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:abc' }))
    expect(res.status).toBe(200)
    expect((await res.json()).skipped).toBe('non_uuid_app_user_id')
    expect(db.released).toBe(false)
  })

  it('啟用 Plus → upsert plan=plus、100 次 AI 額度、200', async () => {
    const res = await POST(
      post({
        type: 'INITIAL_PURCHASE',
        app_user_id: UUID,
        entitlement_ids: ['plus'],
        expiration_at_ms: Date.now() + 30 * 86400000,
      }),
    )
    expect(res.status).toBe(200)
    expect(db.upserted?.plan).toBe('plus')
    expect(db.upserted?.plus_ai_calls_remaining).toBe(100)
  })

  it('撤銷（EXPIRATION）→ 更新 plan=free、200', async () => {
    const res = await POST(post({ type: 'EXPIRATION', app_user_id: UUID }))
    expect(res.status).toBe(200)
    expect(db.updated?.plan).toBe('free')
  })

  it('entitlements 寫入失敗 → 500、上報並釋放 dedupe', async () => {
    db.entitlementError = { message: 'db down' }
    const res = await POST(
      post({ type: 'INITIAL_PURCHASE', app_user_id: UUID, entitlement_ids: ['plus'] }),
    )
    expect(res.status).toBe(500)
    expect(reportError).toHaveBeenCalled()
    expect(db.released).toBe(true)
  })
})
