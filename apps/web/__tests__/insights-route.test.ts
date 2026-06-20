import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/insights route handler 整合測試（風險 B）：streak / 本週洞察是留存露出的資料來源。
// 次要資訊任一失敗各自回退（0 / null）且上報，不讓整個回應失敗。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  fetchStreak: vi.fn(),
  fetchWeeklyInsights: vi.fn(),
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
  }),
}))
vi.mock('@familyplay/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@familyplay/data')>()
  return { ...actual, fetchStreak: h.fetchStreak, fetchWeeklyInsights: h.fetchWeeklyInsights }
})

import { GET } from '../app/api/insights/route'

const CHILD = '11111111-1111-4111-8111-111111111111'
const get = (childId?: string) =>
  new Request(`http://localhost/api/insights${childId ? `?childId=${childId}` : ''}`)

beforeEach(() => {
  h.user = { id: 'u1' }
  h.fetchStreak.mockReset().mockResolvedValue(3)
  h.fetchWeeklyInsights.mockReset().mockResolvedValue({ sessions: 5, activeDays: 3 })
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/insights', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET(get(CHILD))).status).toBe(401)
  })

  it('缺/不合法 childId → 400', async () => {
    expect((await GET(get())).status).toBe(400)
    expect((await GET(get('not-a-uuid'))).status).toBe(400)
  })

  it('成功 → 200 回傳 streak 與 weekly', async () => {
    const json = await (await GET(get(CHILD))).json()
    expect(json.streak).toBe(3)
    expect(json.weekly.sessions).toBe(5)
  })

  it('streak 失敗 → 回退 0 並上報，weekly 仍正常', async () => {
    h.fetchStreak.mockRejectedValue(new Error('boom'))
    const json = await (await GET(get(CHILD))).json()
    expect(json.streak).toBe(0)
    expect(json.weekly.sessions).toBe(5)
    expect(h.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: '/api/insights#streak' }),
    )
  })

  it('weekly 失敗 → 回退 null 並上報，streak 仍正常', async () => {
    h.fetchWeeklyInsights.mockRejectedValue(new Error('boom'))
    const json = await (await GET(get(CHILD))).json()
    expect(json.streak).toBe(3)
    expect(json.weekly).toBeNull()
    expect(h.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: '/api/insights#weekly' }),
    )
  })
})
