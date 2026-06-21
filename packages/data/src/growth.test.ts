import { describe, expect, it } from 'vitest'
import { GrowthError, type GrowthRow, mapGrowthRow, recordGrowth } from './growth'

describe('mapGrowthRow', () => {
  it('映射欄位，NUMERIC 字串轉 number', () => {
    const row: GrowthRow = {
      id: 'g1',
      measured_on: '2026-06-20',
      height_cm: '82.50',
      weight_kg: 11.2,
      head_circ_cm: null,
      created_at: '2026-06-20T00:00:00Z',
    }
    expect(mapGrowthRow(row)).toEqual({
      id: 'g1',
      measuredOn: '2026-06-20',
      heightCm: 82.5,
      weightKg: 11.2,
      headCircCm: null,
      createdAt: '2026-06-20T00:00:00Z',
    })
  })
})

// 最小化 mock：驗證 created_by 由 DB 推出（不信任前端），insert payload 正確。
function makeSupabase(opts: {
  user?: { id: string } | null
  profileId?: string | null
  captured?: { payload?: Record<string, unknown> }
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: 'user' in opts ? opts.user : { id: 'auth-1' } } }),
    },
    from(table: string) {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.profileId === null ? null : { id: opts.profileId ?? 'profile-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      // child_growth_measurements
      return {
        insert: (payload: Record<string, unknown>) => {
          if (opts.captured) opts.captured.payload = payload
          return {
            select: () => ({ single: async () => ({ data: { id: 'new-g' }, error: null }) }),
          }
        },
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

describe('recordGrowth', () => {
  it('created_by 由 DB 推出，回傳新 id', async () => {
    const captured: { payload?: Record<string, unknown> } = {}
    const supabase = makeSupabase({ profileId: 'cg-9', captured })
    const id = await recordGrowth(supabase, { childId: 'child-1', heightCm: 82.5 })
    expect(id).toBe('new-g')
    expect(captured.payload).toMatchObject({
      child_id: 'child-1',
      created_by: 'cg-9',
      height_cm: 82.5,
    })
  })

  it('全空 → GrowthError（提前擋，不打 DB）', async () => {
    await expect(recordGrowth(makeSupabase({}), { childId: 'x' })).rejects.toBeInstanceOf(
      GrowthError,
    )
  })

  it('未登入 → 尚未登入', async () => {
    await expect(
      recordGrowth(makeSupabase({ user: null }), { childId: 'x', weightKg: 10 }),
    ).rejects.toThrow('尚未登入')
  })
})
