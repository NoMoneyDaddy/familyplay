import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/logs/[id] route handler 整合測試（風險 B）：編輯/刪除紀錄的擁有權邊界。
// 重點：未登入 401、限流 429、無效 id/空 patch/壞 JSON → 400、
// RLS 擋下（update/delete 回 0 列）→ 404、DB error → 500 並上報。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  rows: [{ id: 'log-1' }] as unknown[] | null,
  dbError: null as unknown,
  updatePayload: null as Record<string, unknown> | null,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: h.rl }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        h.updatePayload = payload
        return { eq: () => ({ select: async () => ({ data: h.rows, error: h.dbError }) }) }
      },
      delete: () => ({
        eq: () => ({ select: async () => ({ data: h.rows, error: h.dbError }) }),
      }),
    }),
  }),
}))

import { DELETE, PATCH } from '../app/api/logs/[id]/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown, raw = false) =>
  new Request('http://localhost/api/logs/x', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
const delReq = () => new Request('http://localhost/api/logs/x', { method: 'DELETE' })

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.rows = [{ id: 'log-1' }]
  h.dbError = null
  h.updatePayload = null
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('PATCH /api/logs/[id]', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await PATCH(patchReq({ outcome: 'completed' }), ctx(ID))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await PATCH(patchReq({ outcome: 'completed' }), ctx(ID))).status).toBe(429)
  })

  it('id 非 UUID → 400', async () => {
    expect((await PATCH(patchReq({ outcome: 'completed' }), ctx('nope'))).status).toBe(400)
  })

  it('空 patch（無任何欄位）→ 400', async () => {
    expect((await PATCH(patchReq({}), ctx(ID))).status).toBe(400)
  })

  it('壞 JSON → 400', async () => {
    expect((await PATCH(patchReq('x', true), ctx(ID))).status).toBe(400)
  })

  it('只映射有提供的欄位（child_reaction / duration_secs）', async () => {
    const res = await PATCH(patchReq({ childReaction: 'happy', durationSecs: 120 }), ctx(ID))
    expect(res.status).toBe(200)
    expect(h.updatePayload).toEqual({ child_reaction: 'happy', duration_secs: 120 })
  })

  it('RLS 擋下（回 0 列）→ 404', async () => {
    h.rows = []
    expect((await PATCH(patchReq({ outcome: 'completed' }), ctx(ID))).status).toBe(404)
  })

  it('DB error → 500 並上報', async () => {
    h.dbError = { message: 'boom' }
    expect((await PATCH(patchReq({ outcome: 'completed' }), ctx(ID))).status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})

describe('DELETE /api/logs/[id]', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await DELETE(delReq(), ctx(ID))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await DELETE(delReq(), ctx(ID))).status).toBe(429)
  })

  it('id 非 UUID → 400', async () => {
    expect((await DELETE(delReq(), ctx('nope'))).status).toBe(400)
  })

  it('成功 → 200', async () => {
    const res = await DELETE(delReq(), ctx(ID))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('RLS 擋下（回 0 列）→ 404', async () => {
    h.rows = []
    expect((await DELETE(delReq(), ctx(ID))).status).toBe(404)
  })

  it('DB error → 500 並上報', async () => {
    h.dbError = { message: 'boom' }
    expect((await DELETE(delReq(), ctx(ID))).status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})
