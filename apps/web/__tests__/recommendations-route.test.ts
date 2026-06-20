import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// API route handler 整合測試：mock 掉外部相依（cookies / supabase / 限流 / 編排 / 上報），
// 驗證授權、限流、無效輸入、成功路徑，以及 RecommendError code → HTTP 狀態的對應。
// 這是把專案交給 AI 自動維護時最需要的回歸護欄（白皮書風險 B）。

const h = vi.hoisted(() => ({
  fetchRecommendations: vi.fn(),
  reportError: vi.fn(),
  rl: { success: true },
  auth: { user: { id: 'u1' } as { id: string } | null, error: null as unknown },
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [] }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.auth.user }, error: h.auth.error }) },
  }),
}))

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: async () => ({ success: h.rl.success }),
}))

vi.mock('@/lib/observability', () => ({
  reportError: h.reportError,
}))

// 保留真實 RecommendError（instanceof 需要），只覆寫 fetchRecommendations。
vi.mock('@familyplay/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@familyplay/data')>()
  return { ...actual, fetchRecommendations: h.fetchRecommendations }
})

import { RecommendError } from '@familyplay/data'
import { POST } from '../app/api/recommendations/route'

const CHILD_ID = '11111111-1111-4111-8111-111111111111'
const validBody = {
  childId: CHILD_ID,
  parentEnergy: 'low',
  context: 'normal',
  availableSpace: 'anywhere',
}

function post(body: unknown, raw = false) {
  return new Request('http://localhost/api/recommendations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => {
  h.auth.user = { id: 'u1' }
  h.auth.error = null
  h.rl.success = true
  h.fetchRecommendations.mockReset()
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
})

// 還原 stub 的環境變數，避免污染其他測試檔
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/recommendations', () => {
  it('未登入 → 401', async () => {
    h.auth.user = null
    const res = await POST(post(validBody))
    expect(res.status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl.success = false
    const res = await POST(post(validBody))
    expect(res.status).toBe(429)
  })

  it('無效 JSON body → 400', async () => {
    const res = await POST(post('not-json', true))
    expect(res.status).toBe(400)
  })

  it('schema 驗證失敗（缺欄位）→ 400', async () => {
    const res = await POST(post({ childId: CHILD_ID }))
    expect(res.status).toBe(400)
    expect(h.fetchRecommendations).not.toHaveBeenCalled()
  })

  it('成功 → 200 並回傳 recommendations', async () => {
    h.fetchRecommendations.mockResolvedValue([{ id: 'a1', title: '堆積木' }])
    const res = await POST(post(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.recommendations).toHaveLength(1)
  })

  it('RecommendError child_not_found → 404 且訊息為 Child not found', async () => {
    h.fetchRecommendations.mockRejectedValue(new RecommendError('child_not_found', '找不到孩子'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Child not found')
  })

  it('RecommendError age_invalid → 400', async () => {
    h.fetchRecommendations.mockRejectedValue(new RecommendError('age_invalid', '年齡不合法'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(400)
  })

  it('RecommendError activities_failed → 500 且上報 Sentry', async () => {
    h.fetchRecommendations.mockRejectedValue(new RecommendError('activities_failed', '無法載入'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })

  it('非預期錯誤 → 500 且上報', async () => {
    h.fetchRecommendations.mockRejectedValue(new Error('boom'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})
