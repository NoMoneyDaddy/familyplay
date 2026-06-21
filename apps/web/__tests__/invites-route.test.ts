import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/households/invites/{accept,generate} 整合測試（風險 B，跨帳號資料邊界）：
// 邀請碼猜中即可加入他人家庭看到孩子 PII，是安全最敏感路徑。
// 重點：accept 的 RPC 錯誤碼→HTTP 映射、限流防暴力猜碼；generate 的成員資格守門。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  rpcData: 'hh-1' as unknown,
  rpcError: null as { message: string } | null,
  profile: { id: 'p1' } as { id: string } | null,
  membership: { role: 'owner' } as Record<string, unknown> | null,
  invite: { token: 'ABCD1234' } as Record<string, unknown> | null,
  inviteError: null as unknown,
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: h.rl }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    rpc: async () => ({ data: h.rpcData, error: h.rpcError }),
    from: (table: string) => {
      if (table === 'user_profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: h.profile }) }) }) }
      }
      if (table === 'household_members') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: h.membership }) }) }),
          }),
        }
      }
      // household_invites
      return {
        insert: () => ({
          select: () => ({ single: async () => ({ data: h.invite, error: h.inviteError }) }),
        }),
      }
    },
  }),
}))

import { POST as ACCEPT } from '../app/api/households/invites/accept/route'
import { POST as GENERATE } from '../app/api/households/invites/generate/route'

const HH = '11111111-1111-4111-8111-111111111111'
const acceptReq = (body: unknown, raw = false) =>
  new Request('http://localhost/api/households/invites/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
const genReq = (body: unknown) =>
  new Request('http://localhost/api/households/invites/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.rpcData = 'hh-1'
  h.rpcError = null
  h.profile = { id: 'p1' }
  h.membership = { role: 'owner' }
  h.invite = { token: 'ABCD1234' }
  h.inviteError = null
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://familyplay.nomoneydaddy.app')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/households/invites/accept', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await ACCEPT(acceptReq({ code: 'ABCD1234' }))).status).toBe(401)
  })

  it('超出限流（防暴力猜碼）→ 429', async () => {
    h.rl = false
    expect((await ACCEPT(acceptReq({ code: 'ABCD1234' }))).status).toBe(429)
  })

  it('缺 code → 400', async () => {
    expect((await ACCEPT(acceptReq({}))).status).toBe(400)
  })

  it.each([
    ['invalid_code', 400],
    ['expired', 400],
    ['already_used', 400],
    ['already_member', 400],
    ['unauthorized', 401],
  ] as const)('RPC 錯誤 %s → %i', async (msg, status) => {
    h.rpcError = { message: msg }
    expect((await ACCEPT(acceptReq({ code: 'ABCD1234' }))).status).toBe(status)
  })

  it('未知 RPC 錯誤 → 500', async () => {
    h.rpcError = { message: 'something_unexpected' }
    expect((await ACCEPT(acceptReq({ code: 'ABCD1234' }))).status).toBe(500)
  })

  it('成功 → 200 回 householdId', async () => {
    const json = await (await ACCEPT(acceptReq({ code: 'abcd1234' }))).json()
    expect(json.householdId).toBe('hh-1')
  })
})

describe('POST /api/households/invites/generate', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GENERATE(genReq({ householdId: HH, role: 'viewer' }))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await GENERATE(genReq({ householdId: HH, role: 'viewer' }))).status).toBe(429)
  })

  it('無效 role → 400', async () => {
    expect((await GENERATE(genReq({ householdId: HH, role: 'owner' }))).status).toBe(400)
  })

  it('找不到 profile → 404', async () => {
    h.profile = null
    expect((await GENERATE(genReq({ householdId: HH, role: 'viewer' }))).status).toBe(404)
  })

  it('非該家庭成員 → 403', async () => {
    h.membership = null
    expect((await GENERATE(genReq({ householdId: HH, role: 'caregiver' }))).status).toBe(403)
  })

  it('insert 失敗 → 500', async () => {
    h.inviteError = { message: 'boom' }
    expect((await GENERATE(genReq({ householdId: HH, role: 'viewer' }))).status).toBe(500)
  })

  it('成功 → 200，邀請連結用可信 APP_URL（防偽造 host 釣魚）', async () => {
    const json = await (await GENERATE(genReq({ householdId: HH, role: 'caregiver' }))).json()
    expect(json.code).toBe('ABCD1234')
    expect(json.inviteLink).toBe('https://familyplay.nomoneydaddy.app/join?code=ABCD1234')
  })
})
