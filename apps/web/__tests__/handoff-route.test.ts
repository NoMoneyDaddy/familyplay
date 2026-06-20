import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/handoff route 整合測試（風險 B）：交接小卡持久化。
// 保留真實 HandoffError，只覆寫 saveHandoff / fetchHandoffs。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  saveHandoff: vi.fn(),
  fetchHandoffs: vi.fn(),
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
  return { ...actual, saveHandoff: h.saveHandoff, fetchHandoffs: h.fetchHandoffs }
})

import { HandoffError } from '@familyplay/data'
import { GET, POST } from '../app/api/handoff/route'

const CHILD = '11111111-1111-4111-8111-111111111111'
const post = (body: unknown, raw = false) =>
  new Request('http://localhost/api/handoff', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
const get = (childId?: string) =>
  new Request(`http://localhost/api/handoff${childId ? `?childId=${childId}` : ''}`)

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.saveHandoff.mockReset().mockResolvedValue('new-h')
  h.fetchHandoffs.mockReset().mockResolvedValue([])
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/handoff', () => {
  const body = { childId: CHILD, summaryText: '波波今天很投入', logsReferenced: [] }

  it('未登入 → 401', async () => {
    h.user = null
    expect((await POST(post(body))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await POST(post(body))).status).toBe(429)
  })

  it('schema 不合法（空 summaryText）→ 400，且不儲存', async () => {
    const res = await POST(post({ childId: CHILD, summaryText: '' }))
    expect(res.status).toBe(400)
    expect(h.saveHandoff).not.toHaveBeenCalled()
  })

  it('成功 → 200 回 id', async () => {
    const json = await (await POST(post(body))).json()
    expect(json.id).toBe('new-h')
  })

  it('HandoffError（找不到孩子）→ 400', async () => {
    h.saveHandoff.mockRejectedValue(new HandoffError('找不到孩子資料'))
    expect((await POST(post(body))).status).toBe(400)
  })

  it('非預期錯誤 → 500 並上報', async () => {
    h.saveHandoff.mockRejectedValue(new Error('boom'))
    const res = await POST(post(body))
    expect(res.status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})

describe('GET /api/handoff', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET(get(CHILD))).status).toBe(401)
  })

  it('childId 不合法 → 400', async () => {
    expect((await GET(get('nope'))).status).toBe(400)
  })

  it('成功 → 200 回 handoffs', async () => {
    h.fetchHandoffs.mockResolvedValue([
      { id: 'h1', summaryText: 's', logsReferenced: [], createdAt: null },
    ])
    const json = await (await GET(get(CHILD))).json()
    expect(json.handoffs).toHaveLength(1)
  })
})
