import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/children/list route handler 整合測試（白皮書 B1 + D2）：收斂到 fetchChildren 後，
// 驗證 auth/限流守門與 ChildError → 500 映射、成功回 camelCase 清單。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  rows: [] as unknown[] | null,
  error: null as unknown,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: h.rl }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: h.rows, error: h.error }) }) }),
    }),
  }),
}))

import { GET } from '../app/api/children/list/route'

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.rows = []
  h.error = null
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/children/list', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET()).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await GET()).status).toBe(429)
  })

  it('成功 → 200 回 camelCase 清單', async () => {
    h.rows = [
      {
        id: 'c1',
        nickname: '波波',
        birth_year_month: '2024-01',
        stage_key: 'toddler_player',
        created_at: 't',
      },
    ]
    const json = await (await GET()).json()
    expect(json.children[0]).toEqual({
      id: 'c1',
      nickname: '波波',
      birthYearMonth: '2024-01',
      stageKey: 'toddler_player',
      createdAt: 't',
    })
  })

  it('DB 失敗（ChildError）→ 500 並上報', async () => {
    h.error = { message: 'boom' }
    expect((await GET()).status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})
