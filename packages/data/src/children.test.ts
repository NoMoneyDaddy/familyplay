import { describe, expect, it } from 'vitest'
import { ChildError, createChild } from './children'

type Result = { data: unknown; error: unknown }
const ok = (data: unknown): Result => ({ data, error: null })
const fail = (): Result => ({ data: null, error: { message: 'boom' } })

interface Captured {
  rpc?: { name: string; params: Record<string, unknown> }
  householdInsert?: Record<string, unknown>
  childInsert?: Record<string, unknown>
  capInsert?: Record<string, unknown>
  deleted?: boolean
}

// 最小化 mock：涵蓋 user_profiles / households(查+建) / household_members / rpc /
// child_profiles(insert+delete) / child_capability_profiles(insert)。
function makeSupabase(opts: {
  user?: { id: string; user_metadata?: Record<string, unknown> } | null
  profileId?: string | null
  ownedHousehold?: string // undefined = 沒有擁有的家庭
  membership?: string | null // null = 沒有加入的家庭
  rpc?: Result
  childInsert?: Result
  capError?: boolean
  captured?: Captured
}) {
  const cap = opts.captured ?? {}
  return {
    auth: {
      getUser: async () => ({
        data: { user: 'user' in opts ? opts.user : { id: 'auth-1', user_metadata: {} } },
      }),
    },
    rpc: async (name: string, params: Record<string, unknown>) => {
      cap.rpc = { name, params }
      return opts.rpc ?? { data: null, error: { code: 'PGRST202' } }
    },
    from(table: string) {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () =>
                opts.profileId === null ? fail() : ok({ id: opts.profileId ?? 'profile-1' }),
            }),
          }),
        }
      }
      if (table === 'households') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                opts.ownedHousehold === undefined ? ok(null) : ok({ id: opts.ownedHousehold }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            cap.householdInsert = payload
            return { select: () => ({ single: async () => ok({ id: 'hh-new' }) }) }
          },
        }
      }
      if (table === 'household_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () =>
                  opts.membership ? ok({ household_id: opts.membership }) : ok(null),
              }),
            }),
          }),
        }
      }
      if (table === 'child_profiles') {
        return {
          insert: (payload: Record<string, unknown>) => {
            cap.childInsert = payload
            return {
              select: () => ({ single: async () => opts.childInsert ?? ok({ id: 'child-1' }) }),
            }
          },
          delete: () => ({
            eq: async () => {
              cap.deleted = true
              return ok(null)
            },
          }),
        }
      }
      // child_capability_profiles
      return {
        insert: async (payload: Record<string, unknown>) => {
          cap.capInsert = payload
          return opts.capError ? fail() : ok(null)
        },
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

const args = { nickname: '小寶', birthYearMonth: '2024-01' }

describe('createChild', () => {
  it('擁有的家庭 + RPC 成功 → 回 RPC childId，household_id 帶入正確', async () => {
    const captured: Captured = {}
    const supabase = makeSupabase({
      ownedHousehold: 'hh-1',
      rpc: ok('rpc-child'),
      captured,
    })
    const id = await createChild(supabase, args)
    expect(id).toBe('rpc-child')
    expect(captured.rpc?.params.p_household_id).toBe('hh-1')
    expect(captured.rpc?.params.p_birth_year_month).toBe('2024-01')
  })

  it('RPC 未部署 → 退回兩段式 insert child + capability', async () => {
    const captured: Captured = {}
    const supabase = makeSupabase({
      ownedHousehold: 'hh-1',
      rpc: { data: null, error: { code: 'PGRST202' } },
      childInsert: ok({ id: 'c2' }),
      captured,
    })
    const id = await createChild(supabase, args)
    expect(id).toBe('c2')
    expect(captured.childInsert?.household_id).toBe('hh-1')
    expect(captured.capInsert?.child_id).toBe('c2')
  })

  it('能力檔 insert 失敗 → 回滾剛建立的孩子並丟 ChildError', async () => {
    const captured: Captured = {}
    const supabase = makeSupabase({
      ownedHousehold: 'hh-1',
      rpc: { data: null, error: { code: 'PGRST202' } },
      childInsert: ok({ id: 'c3' }),
      capError: true,
      captured,
    })
    await expect(createChild(supabase, args)).rejects.toBeInstanceOf(ChildError)
    expect(captured.deleted).toBe(true)
  })

  it('未登入 → ChildError(unauthorized)', async () => {
    const supabase = makeSupabase({ user: null })
    await expect(createChild(supabase, args)).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('沒有擁有的家庭但有加入的 → 用加入的家庭', async () => {
    const captured: Captured = {}
    const supabase = makeSupabase({
      ownedHousehold: undefined,
      membership: 'hh-m',
      rpc: ok('rc'),
      captured,
    })
    await createChild(supabase, args)
    expect(captured.rpc?.params.p_household_id).toBe('hh-m')
  })

  it('沒有任何家庭 → 新建家庭再用其 id', async () => {
    const captured: Captured = {}
    const supabase = makeSupabase({
      ownedHousehold: undefined,
      membership: null,
      rpc: ok('rc2'),
      captured,
    })
    await createChild(supabase, args)
    expect(captured.householdInsert?.owner_id).toBe('profile-1')
    expect(captured.rpc?.params.p_household_id).toBe('hh-new')
  })
})
