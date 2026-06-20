import { getAgeMonths, getStageKey } from '@familyplay/core'
import type { SupabaseClient } from '@supabase/supabase-js'

// 跨平台共用：建立孩子。家庭歸屬（household_id，NOT NULL）與能力檔（ZPD 前提）由此層
// 統一推出，前端只給 nickname / birthYearMonth。Web（API route）與行動端共用同一份編排，
// 避免兩端各自實作出半套或欄位錯誤的建立流程（行動端先前誤用不存在的 user_id 欄位）。

export type ChildErrorCode =
  | 'unauthorized'
  | 'profile_not_found'
  | 'household_failed'
  | 'create_failed'

export class ChildError extends Error {
  code: ChildErrorCode
  constructor(code: ChildErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * 解析使用者要把孩子加進哪個家庭：
 *   1) 優先用自己「擁有」的家庭
 *   2) 否則用自己「以成員身分加入」的家庭——受邀的 caregiver 也能往共用家庭新增孩子
 *   3) 都沒有才新建一個自己擁有的家庭
 * 查詢失敗（RLS/網路）必須中止，否則會誤判「沒有家庭」而誤建重複家庭。
 */
async function resolveHouseholdId(
  supabase: SupabaseClient,
  userProfileId: string,
  householdName: string,
): Promise<string> {
  const { data: owned, error: ownedError } = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', userProfileId)
    .maybeSingle()
  if (ownedError) throw new ChildError('household_failed', '無法查詢家庭')
  if (owned?.id) return owned.id as string

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_profile_id', userProfileId)
    .limit(1)
    .maybeSingle()
  if (membershipError) throw new ChildError('household_failed', '無法查詢家庭成員')
  if (membership?.household_id) return membership.household_id as string

  const { data: created, error: createError } = await supabase
    .from('households')
    .insert({ owner_id: userProfileId, name: householdName })
    .select('id')
    .single()
  if (createError || !created?.id) throw new ChildError('household_failed', '無法建立家庭')
  return created.id as string
}

/**
 * 建立孩子並回傳 childId。內部解析使用者 → user_profile → 家庭，計算 stageKey，
 * 優先用原子 RPC（child + capability 同交易）；RPC 未部署時退回兩段式 insert + 回滾。
 * 失敗丟帶 code 的 ChildError，呼叫端（Web route）可對應 HTTP 狀態。
 */
export async function createChild(
  supabase: SupabaseClient,
  args: { nickname: string; birthYearMonth: string },
): Promise<string> {
  const { nickname, birthYearMonth } = args

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new ChildError('unauthorized', '尚未登入')

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (profileError || !profile) throw new ChildError('profile_not_found', '找不到使用者資料')

  const householdName = `${(user.user_metadata?.name as string | undefined) ?? '我'}的家庭`
  const householdId = await resolveHouseholdId(supabase, profile.id as string, householdName)

  const stageKey = getStageKey(getAgeMonths(birthYearMonth))

  // 優先用原子化 RPC（child + capability 同一交易）。
  const { data: rpcChildId, error: rpcError } = await supabase.rpc('create_child_with_capability', {
    p_household_id: householdId,
    p_nickname: nickname,
    p_birth_year_month: birthYearMonth,
    p_stage_key: stageKey,
  })
  if (!rpcError && rpcChildId) return rpcChildId as string

  // 只有「函式不存在」（migration 未套用）才退回兩段式；其餘實質錯誤直接丟出。
  const isFuncMissing = rpcError?.code === 'PGRST202' || rpcError?.code === '42883'
  if (rpcError && !isFuncMissing) throw new ChildError('create_failed', '建立孩子失敗')

  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .insert({
      household_id: householdId,
      nickname,
      birth_year_month: birthYearMonth,
      stage_key: stageKey,
    })
    .select('id')
    .single()
  if (childError || !child) throw new ChildError('create_failed', '建立孩子失敗')

  // 能力 profile 是 ZPD 推薦的前提；失敗就回滾剛建立的孩子，避免半套資料。
  const { error: capError } = await supabase
    .from('child_capability_profiles')
    .insert({ child_id: child.id, capabilities: {} })
  if (capError) {
    await supabase.from('child_profiles').delete().eq('id', child.id)
    throw new ChildError('create_failed', '建立孩子失敗')
  }
  return child.id as string
}
