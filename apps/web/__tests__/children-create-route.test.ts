import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// POST /api/children route handler 整合測試（風險 B）：建立孩子是 onboarding 關鍵寫入路徑。
// 編排邏輯已在 packages/data 的 createChild 單測覆蓋；這裡驗證 route 的授權、限流、輸入驗證、
// 以及 ChildError code → HTTP 狀態的對應。保留真實 ChildError，只覆寫 createChild。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  createChild: vi.fn(),
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: h.rl }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
  }),
}))
vi.mock('@familyplay/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@familyplay/data')>()
  return { ...actual, createChild: h.createChild }
})

import { ChildError } from '@familyplay/data'
import { POST } from '../app/api/children/route'

const validBody = { nickname: '小寶', birthYearMonth: '2023-05' }
function post(body: unknown, raw = false) {
  return new Request('http://localhost/api/children', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.createChild.mockReset().mockResolvedValue('child-123')
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/children', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await POST(post(validBody))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await POST(post(validBody))).status).toBe(429)
  })

  it('無效 JSON → 400', async () => {
    expect((await POST(post('x', true))).status).toBe(400)
  })

  it('schema 不合法（birthYearMonth 格式錯）→ 400，且不建立', async () => {
    const res = await POST(post({ nickname: '小寶', birthYearMonth: '2023/5' }))
    expect(res.status).toBe(400)
    expect(h.createChild).not.toHaveBeenCalled()
  })

  it('成功 → 200 回 childId，user 由 route 傳入 createChild', async () => {
    const res = await POST(post(validBody))
    expect(res.status).toBe(200)
    expect((await res.json()).childId).toBe('child-123')
    expect(h.createChild).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ nickname: '小寶', birthYearMonth: '2023-05', user: { id: 'u1' } }),
    )
  })

  it('ChildError profile_not_found → 404（4xx 不上報）', async () => {
    h.createChild.mockRejectedValue(new ChildError('profile_not_found', '找不到使用者資料'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(404)
    expect(h.reportError).not.toHaveBeenCalled()
  })

  it('ChildError household_failed → 500 並上報', async () => {
    h.createChild.mockRejectedValue(new ChildError('household_failed', '無法查詢家庭'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })

  it('非預期錯誤 → 500 並上報', async () => {
    h.createChild.mockRejectedValue(new Error('boom'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})
