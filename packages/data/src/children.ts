import { getAgeMonths, getStageKey } from '@familyplay/core'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// 跨平台共用：建立孩子。家庭歸屬（household_id，NOT NULL）與能力檔（ZPD 前提）由此層
// 統一推出，前端只給 nickname / birthYearMonth。Web（API route）與行動端共用同一份編排，
// 避免兩端各自實作出半套或欄位錯誤的建立流程（行動端先前誤用不存在的 user_id 欄位）。

// 4xx（客戶端）：unauthorized / profile_not_found；5xx（系統/DB）：profile_failed /
// household_failed / create_failed。把「查詢失敗」與「查無資料」分開，避免把後端故障誤判成
// 404（與本 repo 既有準則一致）。
export type ChildErrorCode =
  | 'unauthorized'
  | 'profile_not_found'
  | 'profile_failed'
  | 'household_failed'
  | 'create_failed'
  | 'fetch_failed'

export class ChildError extends Error {
  code: ChildErrorCode
  // 保留原始 DB 錯誤鏈（cause），讓呼叫端（Web route → Sentry）能拿到 PostgreSQL
  // code/message/hint 排查。data 層本身保持平台無關、不做日誌。
  constructor(code: ChildErrorCode, message: string, cause?: unknown) {
    super(message, { cause })
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
  // owner_id 非唯一（schema 允許一人多個家庭）→ 用 order + limit(1) 穩定取一筆，
  // 不能直接 maybeSingle（多筆會報錯而誤判 household_failed、擋住建立孩子）。
  const { data: owned, error: ownedError } = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', userProfileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (ownedError) throw new ChildError('household_failed', '無法查詢家庭', ownedError)
  if (owned?.id) return owned.id as string

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_profile_id', userProfileId)
    // 與 owner 分支一致加 order：屬多個共享家庭時，limit(1) 無 order 取哪筆是未定義的，
    // 會讓「往哪個家庭新增孩子」每次不穩定。固定取最早加入的。
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (membershipError) throw new ChildError('household_failed', '無法查詢家庭成員', membershipError)
  if (membership?.household_id) return membership.household_id as string

  const { data: created, error: createError } = await supabase
    .from('households')
    .insert({ owner_id: userProfileId, name: householdName })
    .select('id')
    .single()
  if (createError || !created?.id)
    throw new ChildError('household_failed', '無法建立家庭', createError)
  return created.id as string
}

/**
 * 建立孩子並回傳 childId。內部解析使用者 → user_profile → 家庭，計算 stageKey，
 * 優先用原子 RPC（child + capability 同交易）；RPC 未部署時退回兩段式 insert + 回滾。
 * 失敗丟帶 code 的 ChildError，呼叫端（Web route）可對應 HTTP 狀態。
 */
export async function createChild(
  supabase: SupabaseClient,
  args: { nickname: string; birthYearMonth: string; user?: User },
): Promise<string> {
  const { nickname, birthYearMonth } = args

  // 呼叫端（Web route）已驗過身分時可傳入 user，避免對 Supabase Auth 多打一次網路請求。
  let user = args.user
  if (!user) {
    const {
      data: { user: fetchedUser },
      error: getUserError,
    } = await supabase.auth.getUser()
    if (!fetchedUser) throw new ChildError('unauthorized', '尚未登入', getUserError)
    user = fetchedUser
  }

  // 查詢失敗（RLS/網路/DB）與「查無 profile」要分開：前者是系統錯誤（5xx），
  // 後者才是真的找不到（404）。用 maybeSingle 才能在查無時回 null 而非報錯。
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (profileError) throw new ChildError('profile_failed', '無法載入使用者資料', profileError)
  if (!profile) throw new ChildError('profile_not_found', '找不到使用者資料')

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
  // （isFuncMissing 時靜默走退路：data 層不做日誌，RPC 未部署仍能建立，僅缺原子保證。）
  const isFuncMissing = rpcError?.code === 'PGRST202' || rpcError?.code === '42883'
  if (rpcError && !isFuncMissing) throw new ChildError('create_failed', '建立孩子失敗', rpcError)

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
  if (childError || !child) throw new ChildError('create_failed', '建立孩子失敗', childError)

  // 能力 profile 是 ZPD 推薦的前提；失敗就回滾剛建立的孩子，避免半套資料。
  const { error: capError } = await supabase
    .from('child_capability_profiles')
    .insert({ child_id: child.id, capabilities: {} })
  if (capError) {
    const { error: rollbackError } = await supabase
      .from('child_profiles')
      .delete()
      .eq('id', child.id)
    // 回滾也失敗 → DB 殘留半套資料，把兩個錯誤都掛進 cause 讓呼叫端上報得知。
    throw new ChildError(
      'create_failed',
      '建立孩子失敗',
      rollbackError ? { capError, rollbackError } : capError,
    )
  }
  return child.id as string
}

export interface ChildSummary {
  id: string
  nickname: string | null
  birthYearMonth: string | null
  stageKey: string | null
  createdAt: string | null
}

export interface ChildRow {
  id: string
  nickname: string | null
  birth_year_month: string | null
  stage_key: string | null
  created_at: string | null
}

/** DB 列 → ChildSummary。抽出以便單元測試。 */
export function mapChildRow(row: ChildRow): ChildSummary {
  return {
    id: row.id,
    nickname: row.nickname,
    birthYearMonth: row.birth_year_month,
    stageKey: row.stage_key,
    createdAt: row.created_at,
  }
}

/**
 * 列出當前使用者可見的孩子（新到舊）。直接查 child_profiles，交給 RLS 依
 * household 成員身分過濾——受邀的次要成員（caregiver/viewer）也看得到共用的孩子。
 * 跨平台共用：Web（API route）與行動端共用，消除兩端各自手刻查詢/映射的漂移。
 */
export async function fetchChildren(supabase: SupabaseClient): Promise<ChildSummary[]> {
  const { data, error } = await supabase
    .from('child_profiles')
    .select('id,nickname,birth_year_month,stage_key,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new ChildError('fetch_failed', '無法載入孩子資料', error)
  return ((data || []) as ChildRow[]).map(mapChildRow)
}
