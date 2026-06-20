import { describe, expect, it } from 'vitest'
import { AccountError, fetchAccount } from './account'

// 最小化 mock：auth.getUser + user_profiles(maybeSingle) + entitlements(maybeSingle)。
function makeSupabase(opts: {
  user?: { id: string } | null
  profile?: Record<string, unknown> | null
  profileError?: boolean
  plan?: string | null
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
                data:
                  opts.profile === undefined
                    ? { id: 'p1', display_name: '阿明', avatar_url: null }
                    : opts.profile,
                error: opts.profileError ? { message: 'boom' } : null,
              }),
            }),
          }),
        }
      }
      // entitlements
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.plan === undefined ? null : { plan: opts.plan },
              error: null,
            }),
          }),
        }),
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

describe('fetchAccount', () => {
  it('成功 → 回 profileId/displayName/avatarUrl/plan', async () => {
    const acc = await fetchAccount(makeSupabase({ plan: 'plus' }))
    expect(acc).toEqual({ profileId: 'p1', displayName: '阿明', avatarUrl: null, plan: 'plus' })
  })

  it('查不到 entitlements → plan 預設 free', async () => {
    expect((await fetchAccount(makeSupabase({}))).plan).toBe('free')
  })

  it('非白名單 plan 值 → 視為 free', async () => {
    expect((await fetchAccount(makeSupabase({ plan: 'enterprise' }))).plan).toBe('free')
  })

  it('未登入 → AccountError(unauthorized)', async () => {
    await expect(fetchAccount(makeSupabase({ user: null }))).rejects.toMatchObject({
      code: 'unauthorized',
    })
  })

  it('查無 profile → AccountError(profile_not_found)', async () => {
    await expect(fetchAccount(makeSupabase({ profile: null }))).rejects.toMatchObject({
      code: 'profile_not_found',
    })
  })

  it('profile 查詢失敗（RLS/網路）→ AccountError(profile_failed)，不誤判 not_found', async () => {
    await expect(fetchAccount(makeSupabase({ profileError: true }))).rejects.toBeInstanceOf(
      AccountError,
    )
    await expect(fetchAccount(makeSupabase({ profileError: true }))).rejects.toMatchObject({
      code: 'profile_failed',
    })
  })
})
