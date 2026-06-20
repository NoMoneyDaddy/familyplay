import { describe, expect, it } from 'vitest'
import { HandoffError, type HandoffRow, mapHandoffRow, saveHandoff } from './handoff'

const baseRow: HandoffRow = {
  id: 'h1',
  summary_text: '波波今天玩積木玩得很投入',
  logs_referenced: ['l1', 'l2'],
  created_at: '2026-06-20T00:00:00Z',
}

describe('mapHandoffRow', () => {
  it('maps fields and defaults null array', () => {
    expect(mapHandoffRow(baseRow)).toEqual({
      id: 'h1',
      summaryText: '波波今天玩積木玩得很投入',
      logsReferenced: ['l1', 'l2'],
      createdAt: '2026-06-20T00:00:00Z',
    })
    expect(mapHandoffRow({ ...baseRow, logs_referenced: null }).logsReferenced).toEqual([])
  })
})

// 最小化 mock：驗證 household_id / created_by 由 DB 推出（不信任前端），insert payload 正確。
function makeSupabase(opts: {
  household?: string | null
  user?: { id: string } | null
  profileId?: string | null
  insertError?: boolean
  captured?: { payload?: Record<string, unknown> }
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: 'user' in opts ? opts.user : { id: 'auth-1' } } }),
    },
    from(table: string) {
      if (table === 'child_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: opts.household === null ? null : { household_id: opts.household ?? 'hh-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: opts.profileId === null ? null : { id: opts.profileId ?? 'profile-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      // handoff_summaries
      return {
        insert: (payload: Record<string, unknown>) => {
          if (opts.captured) opts.captured.payload = payload
          return {
            select: () => ({
              single: async () => ({
                data: opts.insertError ? null : { id: 'new-h' },
                error: opts.insertError ? { message: 'boom' } : null,
              }),
            }),
          }
        },
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

describe('saveHandoff', () => {
  it('household_id/created_by 由 DB 推出，回傳新 id', async () => {
    const captured: { payload?: Record<string, unknown> } = {}
    const supabase = makeSupabase({ household: 'hh-9', profileId: 'cg-9', captured })
    const id = await saveHandoff(supabase, {
      childId: 'child-1',
      summaryText: '摘要',
      logsReferenced: ['l1'],
    })
    expect(id).toBe('new-h')
    expect(captured.payload).toMatchObject({
      household_id: 'hh-9',
      child_id: 'child-1',
      created_by: 'cg-9',
      summary_text: '摘要',
      logs_referenced: ['l1'],
    })
  })

  it('找不到孩子 → HandoffError', async () => {
    const supabase = makeSupabase({ household: null })
    await expect(saveHandoff(supabase, { childId: 'x', summaryText: 's' })).rejects.toBeInstanceOf(
      HandoffError,
    )
  })

  it('未登入 → HandoffError', async () => {
    const supabase = makeSupabase({ user: null })
    await expect(saveHandoff(supabase, { childId: 'x', summaryText: 's' })).rejects.toThrow(
      '尚未登入',
    )
  })

  it('insert 失敗 → HandoffError', async () => {
    const supabase = makeSupabase({ insertError: true })
    await expect(saveHandoff(supabase, { childId: 'x', summaryText: 's' })).rejects.toBeInstanceOf(
      HandoffError,
    )
  })
})
