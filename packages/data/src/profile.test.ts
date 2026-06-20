import { describe, expect, it } from 'vitest'
import { type ProfileResolveKind, resolveProfileId } from './profile'

function makeSupabase(opts: {
  user?: { id: string } | null
  profile?: { id: string } | null
  profileError?: boolean
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: 'user' in opts ? opts.user : { id: 'auth-1' } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: opts.profile === undefined ? { id: 'p1' } : opts.profile,
            error: opts.profileError ? { message: 'boom' } : null,
          }),
        }),
      }),
    }),
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

// onError 回一個帶 kind 的 Error 方便斷言映射
const errFor = (kind: ProfileResolveKind) => Object.assign(new Error(kind), { kind })

describe('resolveProfileId', () => {
  it('成功 → 回 profile id', async () => {
    expect(await resolveProfileId(makeSupabase({}), errFor)).toBe('p1')
  })

  it('未登入 → onError(unauthorized)', async () => {
    await expect(resolveProfileId(makeSupabase({ user: null }), errFor)).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('查詢失敗（系統錯誤）→ onError(failed)，不誤判 not_found', async () => {
    await expect(
      resolveProfileId(makeSupabase({ profileError: true }), errFor),
    ).rejects.toMatchObject({ kind: 'failed' })
  })

  it('查無 profile → onError(not_found)', async () => {
    await expect(resolveProfileId(makeSupabase({ profile: null }), errFor)).rejects.toMatchObject({
      kind: 'not_found',
    })
  })
})
