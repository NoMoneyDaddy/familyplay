import type { SupabaseClient } from '@supabase/supabase-js'

// 跨平台共用：帳號資訊（profile + 目前方案）。
// 「auth → user_profiles.id → entitlements.plan」這段在 web/行動端被重複手刻多次；
// 收斂到此一處，消除兩端漂移。RLS 限本人可讀；查不到 entitlements 視為 free。

export type AccountErrorCode = 'unauthorized' | 'profile_not_found' | 'profile_failed'

export class AccountError extends Error {
  code: AccountErrorCode
  constructor(code: AccountErrorCode, message: string, cause?: unknown) {
    super(message, { cause })
    this.code = code
  }
}

export type Plan = 'free' | 'supporter' | 'plus'

export interface AccountInfo {
  profileId: string
  displayName: string | null
  avatarUrl: string | null
  plan: Plan
}

const PLANS: Plan[] = ['free', 'supporter', 'plus']
function normalizePlan(raw: unknown): Plan {
  return typeof raw === 'string' && (PLANS as string[]).includes(raw) ? (raw as Plan) : 'free'
}

/**
 * 取當前登入者的帳號資訊（profile id / 顯示名稱 / 頭像 / 方案）。
 * 未登入 → unauthorized；查無 profile → profile_not_found；查詢失敗 → profile_failed（5xx 類）。
 * entitlements 查不到或非白名單值一律視為 free。
 */
export async function fetchAccount(supabase: SupabaseClient): Promise<AccountInfo> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new AccountError('unauthorized', '尚未登入')

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (profileError) throw new AccountError('profile_failed', '無法載入帳號資料', profileError)
  if (!profile) throw new AccountError('profile_not_found', '找不到帳號資料')

  const { data: ent } = await supabase
    .from('entitlements')
    .select('plan')
    .eq('user_profile_id', profile.id)
    .maybeSingle()

  return {
    profileId: profile.id as string,
    displayName: (profile.display_name as string | null) ?? null,
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    plan: normalizePlan(ent?.plan),
  }
}
