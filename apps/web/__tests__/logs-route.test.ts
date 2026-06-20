import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/logs GET route handler 整合測試（風險 B1）：陪伴歷史的「可編輯」與
// 多人家庭「誰陪的」名稱解析——這是 route 專屬、非 data 層 fetchHistory 的邏輯。
// 重點：editable 僅本人記的、caregiverName 只在多人家庭顯示（你/暱稱/家人）。

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rl: true,
  myProfileId: 'me' as string | null,
  householdId: 'hh1' as string | null,
  logs: [] as unknown[] | null,
  logsError: null as unknown,
  members: [] as unknown[] | null,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
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
                data: h.myProfileId === null ? null : { id: h.myProfileId },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'child_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: h.householdId === null ? null : { household_id: h.householdId },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'companion_logs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({ limit: async () => ({ data: h.logs, error: h.logsError }) }),
            }),
          }),
        }
      }
      // household_members
      return { select: () => ({ eq: async () => ({ data: h.members }) }) }
    },
  }),
}))

import { GET } from '../app/api/logs/route'

const CHILD = '11111111-1111-4111-8111-111111111111'
const req = (childId?: string) =>
  new Request(`http://localhost/api/logs${childId ? `?childId=${childId}` : ''}`)

beforeEach(() => {
  h.user = { id: 'u1' }
  h.rl = true
  h.myProfileId = 'me'
  h.householdId = 'hh1'
  h.logs = []
  h.logsError = null
  h.members = []
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/logs', () => {
  it('未登入 → 401', async () => {
    h.user = null
    expect((await GET(req(CHILD))).status).toBe(401)
  })

  it('超出限流 → 429', async () => {
    h.rl = false
    expect((await GET(req(CHILD))).status).toBe(429)
  })

  it('缺 childId → 400', async () => {
    expect((await GET(req())).status).toBe(400)
  })

  it('childId 非 UUID → 400', async () => {
    expect((await GET(req('nope'))).status).toBe(400)
  })

  it('logs 查詢錯誤 → 500 並上報', async () => {
    h.logsError = { message: 'boom' }
    expect((await GET(req(CHILD))).status).toBe(500)
    expect(h.reportError).toHaveBeenCalled()
  })

  it('單人家庭：editable 依本人、caregiverName 為 null（不標誰陪的）', async () => {
    h.members = [{ user_profile_id: 'me', nickname: null, user_profiles: { display_name: '我' } }]
    h.logs = [
      {
        id: 'l1',
        caregiver_id: 'me',
        outcome: 'completed',
        child_reaction: 'happy',
        created_at: 't',
        duration_secs: 60,
        companion_activities: { title: '積木' },
      },
    ]
    const json = await (await GET(req(CHILD))).json()
    expect(json.logs[0]).toMatchObject({
      editable: true,
      caregiverName: null,
      activityTitle: '積木',
    })
  })

  it('多人家庭：本人標「你」、他人用暱稱、editable 僅本人', async () => {
    h.members = [
      { user_profile_id: 'me', nickname: '媽媽', user_profiles: null },
      { user_profile_id: 'other', nickname: '阿嬤', user_profiles: null },
    ]
    h.logs = [
      {
        id: 'l1',
        caregiver_id: 'me',
        outcome: 'completed',
        child_reaction: 'happy',
        created_at: 't',
        duration_secs: 60,
        companion_activities: { title: '積木' },
      },
      {
        id: 'l2',
        caregiver_id: 'other',
        outcome: 'tried',
        child_reaction: 'neutral',
        created_at: 't',
        duration_secs: null,
        companion_activities: { title: '繪本' },
      },
    ]
    const json = await (await GET(req(CHILD))).json()
    expect(json.logs[0]).toMatchObject({ editable: true, caregiverName: '你' })
    expect(json.logs[1]).toMatchObject({ editable: false, caregiverName: '阿嬤' })
  })

  it('多人家庭：他人但無暱稱 → 後備「家人」', async () => {
    h.members = [
      { user_profile_id: 'me', nickname: '媽媽', user_profiles: null },
      { user_profile_id: 'other', nickname: null, user_profiles: null },
    ]
    h.logs = [
      {
        id: 'l2',
        caregiver_id: 'other',
        outcome: 'tried',
        child_reaction: 'neutral',
        created_at: 't',
        duration_secs: null,
        companion_activities: null,
      },
    ]
    const json = await (await GET(req(CHILD))).json()
    expect(json.logs[0]).toMatchObject({ caregiverName: '家人', activityTitle: 'Unknown Activity' })
  })
})
