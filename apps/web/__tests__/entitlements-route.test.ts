import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/account/entitlements 整合測試（風險 B）：方案/配額讀取的契約。
// 重點：未登入 401、無 profile/無 entitlements → 200 free 預設、正常映射、
// 形狀驗證失敗（壞 plan）→ 500。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  profile: { id: 'p1' } as { id: string } | null,
  entitlements: null as Record<string, unknown> | null,
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === 'user_profiles' ? h.profile : h.entitlements,
          }),
        }),
      }),
    }),
  }),
}))

import { GET } from '../app/api/account/entitlements/route'

beforeEach(() => {
  h.user = { id: 'u1' }
  h.profile = { id: 'p1' }
  h.entitlements = null
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/account/entitlements', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET(new Request('http://localhost'))).status).toBe(401)
  })

  it('無 profile → 200 free 預設', async () => {
    h.profile = null
    const json = await (await GET(new Request('http://localhost'))).json()
    expect(json).toMatchObject({ plan: 'free', plusAiCallsRemaining: 0 })
  })

  it('無 entitlements 列 → 200 free 預設', async () => {
    const json = await (await GET(new Request('http://localhost'))).json()
    expect(json.plan).toBe('free')
  })

  it('plus 方案 → 200 映射 camelCase 與配額', async () => {
    h.entitlements = {
      plan: 'plus',
      supporter_purchased_at: null,
      plus_started_at: '2026-06-01T00:00:00.000Z',
      plus_ends_at: '2026-07-01T00:00:00.000Z',
      plus_ai_calls_remaining: 87,
      plus_ai_calls_reset_at: '2026-07-01T00:00:00.000Z',
    }
    const json = await (await GET(new Request('http://localhost'))).json()
    expect(json).toMatchObject({
      plan: 'plus',
      plusStartedAt: '2026-06-01T00:00:00.000Z',
      plusAiCallsRemaining: 87,
    })
  })

  it('plus_ai_calls_remaining 為 null → 預設 0', async () => {
    h.entitlements = {
      plan: 'supporter',
      supporter_purchased_at: '2026-06-01T00:00:00.000Z',
      plus_started_at: null,
      plus_ends_at: null,
      plus_ai_calls_remaining: null,
      plus_ai_calls_reset_at: null,
    }
    const json = await (await GET(new Request('http://localhost'))).json()
    expect(json.plusAiCallsRemaining).toBe(0)
  })

  it('壞 plan 值（形狀驗證失敗）→ 500', async () => {
    h.entitlements = {
      plan: 'enterprise',
      supporter_purchased_at: null,
      plus_started_at: null,
      plus_ends_at: null,
      plus_ai_calls_remaining: 0,
      plus_ai_calls_reset_at: null,
    }
    expect((await GET(new Request('http://localhost'))).status).toBe(500)
  })
})
