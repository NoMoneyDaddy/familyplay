import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/log route handler 整合測試（風險 B）：陪伴紀錄寫入是 Step8/streak/歷史的資料入口。
// 保留真實 LogError（instanceof 需要），只覆寫 logCompanion。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  logCompanion: vi.fn(),
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
  return { ...actual, logCompanion: h.logCompanion }
})

import { LogError } from '@familyplay/data'
import { POST } from '../app/api/log/route'

const CHILD = '11111111-1111-4111-8111-111111111111'
const ACT = '22222222-2222-4222-8222-222222222222'
const validBody = { childId: CHILD, activityId: ACT, outcome: 'completed', childReaction: 'happy' }

function post(body: unknown, raw = false) {
  return new Request('http://localhost/api/log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.logCompanion.mockReset()
  h.logCompanion.mockResolvedValue(undefined)
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/log', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await POST(post(validBody))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await POST(post(validBody))).status).toBe(429)
  })

  it('無效 JSON → 400（SyntaxError 不上報）', async () => {
    const res = await POST(post('x', true))
    expect(res.status).toBe(400)
    expect(h.reportError).not.toHaveBeenCalled()
  })

  it('schema 不合法（outcome 錯）→ 400，且不寫入', async () => {
    const res = await POST(post({ ...validBody, outcome: 'nope' }))
    expect(res.status).toBe(400)
    expect(h.logCompanion).not.toHaveBeenCalled()
  })

  it('成功 → 200', async () => {
    const res = await POST(post(validBody))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('LogError（如找不到孩子）→ 400 並帶訊息', async () => {
    h.logCompanion.mockRejectedValue(new LogError('找不到孩子資料'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('找不到孩子資料')
  })

  it('非預期錯誤 → 500 並上報', async () => {
    h.logCompanion.mockRejectedValue(new Error('db down'))
    const res = await POST(post(validBody))
    expect(res.status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})
