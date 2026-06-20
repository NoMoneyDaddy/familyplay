import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/children/[id] route handler 整合測試（風險 B）：編輯/刪除孩子的擁有權邊界。
// 重點：未登入 401、找不到 profile/非擁有者 → 404、壞 JSON → 400、無效 schema → 400、
// update/delete DB error → 500 並上報。擁有權檢查涵蓋 owner/caregiver 角色。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  profile: { id: 'p1' } as { id: string } | null,
  memberships: [{ household_id: 'hh1' }] as { household_id: string }[] | null,
  ownedChild: { id: 'c1' } as { id: string } | null,
  updatedRow: {
    id: 'c1',
    nickname: '波波',
    birth_year_month: '2024-01',
    stage_key: 'toddler_player',
  } as Record<string, unknown> | null,
  updateError: null as unknown,
  deleteError: null as unknown,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: (table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: h.profile }) }) }),
        }
      }
      if (table === 'household_members') {
        return {
          select: () => ({ eq: () => ({ in: async () => ({ data: h.memberships }) }) }),
        }
      }
      // child_profiles：擁有權 select / 更新 update / 刪除 delete 三種進入點
      return {
        select: () => ({
          eq: () => ({ in: () => ({ single: async () => ({ data: h.ownedChild }) }) }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: h.updatedRow, error: h.updateError }),
            }),
          }),
        }),
        delete: () => ({ eq: async () => ({ error: h.deleteError }) }),
      }
    },
  }),
}))

import { DELETE, PUT } from '../app/api/children/[id]/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown, raw = false) =>
  new Request('http://localhost/api/children/x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
const delReq = () => new Request('http://localhost/api/children/x', { method: 'DELETE' })

beforeEach(() => {
  h.user = { id: 'u1' }
  h.profile = { id: 'p1' }
  h.memberships = [{ household_id: 'hh1' }]
  h.ownedChild = { id: 'c1' }
  h.updatedRow = {
    id: 'c1',
    nickname: '波波',
    birth_year_month: '2024-01',
    stage_key: 'toddler_player',
  }
  h.updateError = null
  h.deleteError = null
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('PUT /api/children/[id]', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await PUT(putReq({ nickname: 'x' }), ctx())).status).toBe(401)
  })

  it('找不到 user profile → 404', async () => {
    h.profile = null
    expect((await PUT(putReq({ nickname: 'x' }), ctx())).status).toBe(404)
  })

  it('非擁有者（無 owner/caregiver 角色）→ 404', async () => {
    h.memberships = []
    expect((await PUT(putReq({ nickname: 'x' }), ctx())).status).toBe(404)
  })

  it('孩子不屬於任一家庭 → 404', async () => {
    h.ownedChild = null
    expect((await PUT(putReq({ nickname: 'x' }), ctx())).status).toBe(404)
  })

  it('壞 JSON → 400', async () => {
    expect((await PUT(putReq('x', true), ctx())).status).toBe(400)
  })

  it('無效 birthYearMonth 格式 → 400', async () => {
    expect((await PUT(putReq({ birthYearMonth: '2024/1' }), ctx())).status).toBe(400)
  })

  it('成功 → 200 回 camelCase 欄位', async () => {
    const json = await (await PUT(putReq({ nickname: '波波' }), ctx())).json()
    expect(json).toEqual({
      id: 'c1',
      nickname: '波波',
      birthYearMonth: '2024-01',
      stageKey: 'toddler_player',
    })
  })

  it('update DB error → 500 並上報', async () => {
    h.updateError = { message: 'boom' }
    expect((await PUT(putReq({ nickname: '波波' }), ctx())).status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})

describe('DELETE /api/children/[id]', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await DELETE(delReq(), ctx())).status).toBe(401)
  })

  it('非擁有者 → 404', async () => {
    h.ownedChild = null
    expect((await DELETE(delReq(), ctx())).status).toBe(404)
  })

  it('成功 → 200', async () => {
    const res = await DELETE(delReq(), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('delete DB error → 500 並上報', async () => {
    h.deleteError = { message: 'boom' }
    expect((await DELETE(delReq(), ctx())).status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })
})
