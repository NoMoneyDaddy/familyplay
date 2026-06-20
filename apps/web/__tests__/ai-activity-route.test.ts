import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/ai/activity route handler 整合測試（白皮書風險 B：最複雜的韌性路徑）。
// 涵蓋 BYO / Plus 託管兩種模式、限流 fail-closed、Safety Filter 失敗安靜降回、
// 託管配額 consume/refund。保留 @familyplay/ai 的白名單常數與 prompt builder、
// @familyplay/core 的年齡換算為真實，只 mock provider 呼叫與 supabase。

const s = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  child: { data: { id: 'c1', birth_year_month: '2023-01' }, error: null } as {
    data: { id: string; birth_year_month: string } | null
    error: unknown
  },
  consume: { allowed: true } as { allowed?: boolean; reason?: string } | null,
  consumeErr: null as unknown,
  generate: { ok: true, content: '{}' } as
    | { ok: true; content: string }
    | { ok: false; reason: string },
  parsed: { title: 'AI 活動' } as Record<string, unknown> | null,
  refundCalled: false,
}))
const generateSafe = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: s.rl }) }))
vi.mock('@familyplay/assessment', () => ({ getZpdTargets: () => [], CAPABILITY_LABELS: {} }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: s.user }, error: null }) },
    from(table: string) {
      if (table === 'child_profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => s.child }) }) }
      }
      // child_capability_profiles
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { capabilities: {} }, error: null }) }),
        }),
      }
    },
    rpc: async (name: string) => {
      if (name === 'consume_plus_ai_call') return { data: s.consume, error: s.consumeErr }
      return { data: null, error: null }
    },
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async (name: string) => {
      if (name === 'refund_plus_ai_call') s.refundCalled = true
      return { error: null }
    },
  }),
}))

vi.mock('@familyplay/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@familyplay/ai')>()
  return {
    ...actual,
    getProvider: () => ({ name: 'mock' }),
    generateSafe,
    parseGeneratedActivity: () => s.parsed,
  }
})

import { POST } from '../app/api/ai/activity/route'

const CHILD = '11111111-1111-4111-8111-111111111111'
const byoBody = {
  childId: CHILD,
  companionType: 'play',
  provider: 'gemini',
  apiKey: 'k',
  model: 'gemini-test',
}
const managedBody = { childId: CHILD, companionType: 'play' }

function post(body: unknown, raw = false) {
  return new Request('http://localhost/api/ai/activity', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => {
  s.user = { id: 'u1' }
  s.rl = true
  s.child = { data: { id: 'c1', birth_year_month: '2023-01' }, error: null }
  s.consume = { allowed: true }
  s.consumeErr = null
  s.generate = { ok: true, content: '{}' }
  s.parsed = { title: 'AI 活動' }
  s.refundCalled = false
  generateSafe.mockReset()
  generateSafe.mockImplementation(async () => s.generate)
  reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
  vi.stubEnv('AI_MANAGED_PROVIDER', 'gemini')
  vi.stubEnv('AI_MANAGED_KEY', 'managed-key')
  vi.stubEnv('AI_MANAGED_MODEL', 'managed-model')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/ai/activity', () => {
  it('未登入 → 401', async () => {
    s.user = null
    expect((await POST(post(byoBody))).status).toBe(401)
  })

  it('限流（fail-closed）→ 429 ok:false rate_limited', async () => {
    s.rl = false
    const res = await POST(post(byoBody))
    expect(res.status).toBe(429)
    expect((await res.json()).reason).toBe('rate_limited')
  })

  it('無效 JSON → 400', async () => {
    expect((await POST(post('x', true))).status).toBe(400)
  })

  it('schema 不合法（companionType 錯）→ 400', async () => {
    expect((await POST(post({ childId: CHILD, companionType: 'nope' }))).status).toBe(400)
  })

  it('BYO 缺金鑰 → 安靜降回 no_key', async () => {
    const res = await POST(post({ childId: CHILD, companionType: 'play', provider: 'gemini' }))
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.reason).toBe('no_key')
  })

  it('託管模式但未配置託管 provider → 安靜降回 no_provider', async () => {
    vi.stubEnv('AI_MANAGED_PROVIDER', '')
    const json = await (await POST(post(managedBody))).json()
    expect(json.ok).toBe(false)
    expect(json.reason).toBe('no_provider')
  })

  it('找不到孩子 → 404', async () => {
    s.child = { data: null, error: null }
    expect((await POST(post(byoBody))).status).toBe(404)
  })

  it('託管：非 Plus / 配額用盡 → not_plus，且不呼叫生成', async () => {
    s.consume = { allowed: false, reason: 'not_plus' }
    const json = await (await POST(post(managedBody))).json()
    expect(json.reason).toBe('not_plus')
    expect(generateSafe).not.toHaveBeenCalled()
  })

  it('託管：扣配額成功 + 生成成功 → ok:true source ai', async () => {
    const json = await (await POST(post(managedBody))).json()
    expect(json.ok).toBe(true)
    expect(json.source).toBe('ai')
    expect(s.refundCalled).toBe(false)
  })

  it('託管：生成失敗 → 退還配額並降回', async () => {
    s.generate = { ok: false, reason: 'safety_blocked' }
    const json = await (await POST(post(managedBody))).json()
    expect(json.ok).toBe(false)
    expect(json.reason).toBe('safety_blocked')
    expect(s.refundCalled).toBe(true)
  })

  it('託管：解析失敗 → 退還配額並降回 parse_failed', async () => {
    s.parsed = null
    const json = await (await POST(post(managedBody))).json()
    expect(json.reason).toBe('parse_failed')
    expect(s.refundCalled).toBe(true)
  })

  it('BYO：生成成功 → ok:true，不扣/退配額', async () => {
    const json = await (await POST(post(byoBody))).json()
    expect(json.ok).toBe(true)
    expect(s.refundCalled).toBe(false)
  })
})
