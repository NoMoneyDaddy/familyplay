import { ALLOWED_CAPABILITY_KEYS } from '@familyplay/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/capabilities route handler 整合測試（風險 B）：里程碑標記驅動 ZPD 推薦。
// 重點：新增的 rate limit、GET 白名單過濾、PATCH 原子 RPC 成功/ RLS 擋下→404。

const VALID_KEY = ALLOWED_CAPABILITY_KEYS[0]

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  selectData: null as { capabilities: Record<string, boolean> } | null,
  selectError: null as unknown,
  rpcData: undefined as unknown,
  rpcError: null as unknown,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: h.rl }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: h.selectData, error: h.selectError }) }),
      }),
    }),
    rpc: async () => ({ data: h.rpcData, error: h.rpcError }),
  }),
}))

import { GET, PATCH } from '../app/api/capabilities/route'

const CHILD = '11111111-1111-4111-8111-111111111111'
const getReq = (childId?: string) =>
  new Request(`http://localhost/api/capabilities${childId ? `?childId=${childId}` : ''}`)
const patchReq = (body: unknown, raw = false) =>
  new Request('http://localhost/api/capabilities', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.selectData = null
  h.selectError = null
  h.rpcData = undefined
  h.rpcError = null
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/capabilities', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET(getReq(CHILD))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await GET(getReq(CHILD))).status).toBe(429)
  })

  it('childId 不合法 → 400', async () => {
    expect((await GET(getReq('nope'))).status).toBe(400)
  })

  it('成功 → 200，且只回白名單內為 true 的能力', async () => {
    h.selectData = { capabilities: { [VALID_KEY]: true, bogus_key: true, [`${VALID_KEY}`]: true } }
    const json = await (await GET(getReq(CHILD))).json()
    expect(json.capabilities[VALID_KEY]).toBe(true)
    expect(json.capabilities.bogus_key).toBeUndefined()
  })
})

describe('PATCH /api/capabilities', () => {
  const body = { childId: CHILD, capabilityKey: VALID_KEY, achieved: true }

  it('未登入 → 401', async () => {
    h.user = null
    expect((await PATCH(patchReq(body))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await PATCH(patchReq(body))).status).toBe(429)
  })

  it('無效 JSON → 400', async () => {
    expect((await PATCH(patchReq('x', true))).status).toBe(400)
  })

  it('未知能力 key → 400', async () => {
    const res = await PATCH(patchReq({ childId: CHILD, capabilityKey: 'not_real', achieved: true }))
    expect(res.status).toBe(400)
  })

  it('RPC 成功 → 200 回過濾後能力', async () => {
    h.rpcData = { [VALID_KEY]: true, bogus: true }
    const json = await (await PATCH(patchReq(body))).json()
    expect(json.capabilities[VALID_KEY]).toBe(true)
    expect(json.capabilities.bogus).toBeUndefined()
  })

  it('RLS 擋下（RPC 回 null）→ 404', async () => {
    h.rpcData = null
    expect((await PATCH(patchReq(body))).status).toBe(404)
  })
})
