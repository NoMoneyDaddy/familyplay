import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/profile route handler 整合測試（風險 B）：方案/配額是付費 UI 的判斷來源。
// 重點：entitlements 查詢錯誤 → planStatus:'unknown' + plan:null（前端不藏 Plus 入口）；
// plusAiCallsRemaining 只在 plan='plus' 才回數字。

const h = vi.hoisted(() => ({
  user: { id: 'auth-1', user_metadata: {} } as {
    id: string
    user_metadata?: Record<string, unknown>
  } | null,
  profile: { id: 'p1', display_name: '家長', avatar_url: null } as Record<string, unknown> | null,
  member: { household_id: 'hh1', role: 'owner' } as Record<string, unknown> | null,
  entitlements: null as Record<string, unknown> | null,
  entError: null as unknown,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from(table: string) {
      if (table === 'user_profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: h.profile }) }) }) }
      }
      if (table === 'household_members') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.member }) }) }),
        }
      }
      // entitlements
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: h.entitlements, error: h.entError }) }),
        }),
      }
    },
  }),
}))

import { GET } from '../app/api/profile/route'

beforeEach(() => {
  h.user = { id: 'auth-1', user_metadata: {} }
  h.profile = { id: 'p1', display_name: '家長', avatar_url: null }
  h.member = { household_id: 'hh1', role: 'owner' }
  h.entitlements = null
  h.entError = null
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/profile', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET()).status).toBe(401)
  })

  it('無 entitlements 列 → plan=free、planStatus=ok、配額 null', async () => {
    const json = await (await GET()).json()
    expect(json.plan).toBe('free')
    expect(json.planStatus).toBe('ok')
    expect(json.plusAiCallsRemaining).toBeNull()
    expect(json.userProfileId).toBe('p1')
  })

  it('entitlements 查詢錯誤 → plan=null、planStatus=unknown 並上報（前端不藏 Plus 入口）', async () => {
    h.entError = { message: 'rls boom' }
    const json = await (await GET()).json()
    expect(json.plan).toBeNull()
    expect(json.planStatus).toBe('unknown')
    expect(h.reportError).toHaveBeenCalled()
  })

  it('Plus 會員 → 回傳 plusAiCallsRemaining 數字', async () => {
    h.entitlements = { plan: 'plus', plus_ends_at: null, plus_ai_calls_remaining: 42 }
    const json = await (await GET()).json()
    expect(json.plan).toBe('plus')
    expect(json.plusAiCallsRemaining).toBe(42)
  })

  it('非 Plus（supporter）→ plusAiCallsRemaining 為 null', async () => {
    h.entitlements = { plan: 'supporter', plus_ai_calls_remaining: 99 }
    const json = await (await GET()).json()
    expect(json.plan).toBe('supporter')
    expect(json.plusAiCallsRemaining).toBeNull()
  })

  it('找不到 user_profile → 仍回預設 free 檔（不 500）', async () => {
    h.profile = null
    const json = await (await GET()).json()
    expect(json.userProfileId).toBeNull()
    expect(json.plan).toBe('free')
  })
})
