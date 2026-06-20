import { describe, expect, it } from 'vitest'
import { LogError, logCompanion } from '../lib/log'

// 最小化 mock：模擬 child_profiles / user_profiles 查詢 + companion_logs insert，
// 驗證 household_id / caregiver_id 由 DB 推出（不信任前端），且 insert payload 正確。
function makeSupabase(opts: {
  household?: string | null
  user?: { id: string } | null
  profileId?: string | null
  insertError?: boolean
  captured?: { payload?: Record<string, unknown> }
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: 'user' in opts ? opts.user : { id: 'auth-1' } },
      }),
    },
    from(table: string) {
      if (table === 'child_profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data:
                  opts.household === undefined
                    ? { household_id: 'hh-1' }
                    : opts.household === null
                      ? null
                      : { household_id: opts.household },
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
      // companion_logs
      return {
        insert: async (payload: Record<string, unknown>) => {
          if (opts.captured) opts.captured.payload = payload
          return { error: opts.insertError ? { message: 'boom' } : null }
        },
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

describe('logCompanion', () => {
  it('derives household_id and caregiver_id from DB, not from input', async () => {
    const captured: { payload?: Record<string, unknown> } = {}
    const supabase = makeSupabase({ household: 'hh-9', profileId: 'cg-9', captured })
    await logCompanion(supabase, {
      childId: 'child-1',
      activityId: 'act-1',
      outcome: 'completed',
      childReaction: 'happy',
    })
    expect(captured.payload).toMatchObject({
      child_id: 'child-1',
      activity_id: 'act-1',
      household_id: 'hh-9',
      caregiver_id: 'cg-9',
      outcome: 'completed',
      child_reaction: 'happy',
    })
  })

  it('throws when child not found / no household', async () => {
    const supabase = makeSupabase({ household: null })
    await expect(
      logCompanion(supabase, {
        childId: 'x',
        activityId: 'a',
        outcome: 'completed',
        childReaction: 'happy',
      }),
    ).rejects.toBeInstanceOf(LogError)
  })

  it('throws when not signed in', async () => {
    const supabase = makeSupabase({ user: null })
    await expect(
      logCompanion(supabase, {
        childId: 'x',
        activityId: 'a',
        outcome: 'completed',
        childReaction: 'happy',
      }),
    ).rejects.toThrow('尚未登入')
  })

  it('wraps insert failure in LogError', async () => {
    const supabase = makeSupabase({ insertError: true })
    await expect(
      logCompanion(supabase, {
        childId: 'x',
        activityId: 'a',
        outcome: 'tried',
        childReaction: 'neutral',
      }),
    ).rejects.toBeInstanceOf(LogError)
  })
})
