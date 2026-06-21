import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/saved route handler 整合測試（風險 B）：個人收藏的讀/收/取消三條寫入路徑。
// 重點：未登入 401、限流 429、無效輸入 400、找不到 profile 404、DB 失敗 500、
// upsert ignoreDuplicates 讓重複收藏視為成功。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  profileId: 'p1' as string | null,
  listData: [] as unknown[],
  listError: null as unknown,
  upsertError: null as unknown,
  deleteError: null as unknown,
  upsertCalled: null as Record<string, unknown> | null,
  deleteEqs: [] as [string, string][],
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: h.rl }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: (table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: h.profileId === null ? null : { id: h.profileId },
                error: null,
              }),
            }),
          }),
        }
      }
      // saved_activities
      return {
        select: () => ({
          order: () => ({ limit: async () => ({ data: h.listData, error: h.listError }) }),
        }),
        upsert: (payload: Record<string, unknown>) => {
          h.upsertCalled = payload
          return { error: h.upsertError }
        },
        delete: () => {
          const eqs: [string, string][] = []
          const chain = {
            eq: (col: string, val: string) => {
              eqs.push([col, val])
              h.deleteEqs = eqs
              // 第二個 eq 才 await，回傳結果；第一個 eq 回 chain 續接
              return eqs.length >= 2
                ? Promise.resolve({ error: h.deleteError })
                : (chain as unknown as typeof chain)
            },
          }
          return chain
        },
      }
    },
  }),
}))

import { DELETE, GET, POST } from '../app/api/saved/route'

const ACTIVITY = '11111111-1111-4111-8111-111111111111'
const postReq = (body: unknown, raw = false) =>
  new Request('http://localhost/api/saved', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
const delReq = (activityId?: string) =>
  new Request(`http://localhost/api/saved${activityId ? `?activityId=${activityId}` : ''}`, {
    method: 'DELETE',
  })

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.profileId = 'p1'
  h.listData = []
  h.listError = null
  h.upsertError = null
  h.deleteError = null
  h.upsertCalled = null
  h.deleteEqs = []
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/saved', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET(new Request('http://localhost'))).status).toBe(401)
  })

  it('DB 失敗 → 500', async () => {
    h.listError = { message: 'boom' }
    expect((await GET(new Request('http://localhost'))).status).toBe(500)
  })

  it('成功 → 200 回 saved 陣列', async () => {
    h.listData = [{ activity_id: ACTIVITY }]
    const json = await (await GET(new Request('http://localhost'))).json()
    expect(json.saved).toHaveLength(1)
  })
})

describe('POST /api/saved', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await POST(postReq({ activityId: ACTIVITY }))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await POST(postReq({ activityId: ACTIVITY }))).status).toBe(429)
  })

  it('無效 JSON → 400', async () => {
    expect((await POST(postReq('x', true))).status).toBe(400)
  })

  it('非 UUID → 400', async () => {
    expect((await POST(postReq({ activityId: 'nope' }))).status).toBe(400)
  })

  it('找不到 profile → 404', async () => {
    h.profileId = null
    expect((await POST(postReq({ activityId: ACTIVITY }))).status).toBe(404)
  })

  it('成功 → 200，upsert 帶 profile/activity 且 ignoreDuplicates', async () => {
    const res = await POST(postReq({ activityId: ACTIVITY }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: true })
    expect(h.upsertCalled).toMatchObject({ user_profile_id: 'p1', activity_id: ACTIVITY })
  })

  it('DB 失敗 → 500', async () => {
    h.upsertError = { message: 'boom' }
    expect((await POST(postReq({ activityId: ACTIVITY }))).status).toBe(500)
  })
})

describe('DELETE /api/saved', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await DELETE(delReq(ACTIVITY))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await DELETE(delReq(ACTIVITY))).status).toBe(429)
  })

  it('缺 activityId → 400', async () => {
    expect((await DELETE(delReq())).status).toBe(400)
  })

  it('找不到 profile → 404', async () => {
    h.profileId = null
    expect((await DELETE(delReq(ACTIVITY))).status).toBe(404)
  })

  it('成功 → 200，顯式比對 user_profile_id 與 activity_id', async () => {
    const res = await DELETE(delReq(ACTIVITY))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: false })
    expect(h.deleteEqs).toEqual([
      ['user_profile_id', 'p1'],
      ['activity_id', ACTIVITY],
    ])
  })

  it('DB 失敗 → 500', async () => {
    h.deleteError = { message: 'boom' }
    expect((await DELETE(delReq(ACTIVITY))).status).toBe(500)
  })
})
