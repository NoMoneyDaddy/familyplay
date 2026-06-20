import {
  type Activity,
  ALLOWED_STAGE_KEYS,
  buildReactionStats,
  type CompanionContext,
  getAgeMonths,
  getRecommendations,
  getStageKey,
  type ParentEnergy,
  type SpaceType,
  type StageKey,
} from '@familyplay/core'
import type { SupabaseClient } from '@supabase/supabase-js'

// 行動端的推薦編排：與 Web 的 /api/recommendations 同一套流程，但直接用行動端
// Supabase client（帶 session → RLS 自動生效），呼叫 packages/core 的引擎。
// 不經 Web API（cookie 驗證讀不到 mobile 的 bearer token），改在端上編排查詢。

export interface RecommendInputs {
  parentEnergy: ParentEnergy
  context: CompanionContext
  availableSpace: SpaceType
  availableResources?: string[]
  maxDurationMinutes?: number
  // 「換一批」：硬排除已看過的活動
  excludeIds?: string[]
}

export interface RecommendedActivity {
  id: string
  title: string
  score: number
  reasons: string[]
  minDurationMinutes: number
  maxDurationMinutes: number
  stimulationLevel: 'low' | 'medium' | 'high'
  developmentalFocus: string[]
}

// companion_activities 一列（snake_case，對應 DB）。
export interface ActivityRow {
  id: string
  title: string
  min_age_months: number
  max_age_months: number
  required_capabilities: string[] | null
  optional_capabilities: string[] | null
  zpd_targets: string[] | null
  developmental_focus: string[] | null
  stimulation_level: 'low' | 'medium' | 'high'
  required_resources: string[] | null
  space_requirement: SpaceType | null
  min_duration_minutes: number
  max_duration_minutes: number
  is_bedtime_safe: boolean
  is_sick_day_safe: boolean
  is_fallback: boolean
  is_active: boolean
}

const ACTIVITY_COLUMNS =
  'id,title,min_age_months,max_age_months,required_capabilities,optional_capabilities,zpd_targets,developmental_focus,stimulation_level,required_resources,space_requirement,min_duration_minutes,max_duration_minutes,is_bedtime_safe,is_sick_day_safe,is_fallback,is_active'

/** DB 列（snake_case）→ 引擎 Activity（camelCase）。抽出以便單元測試。 */
export function mapActivityRow(a: ActivityRow): Activity {
  return {
    id: a.id,
    title: a.title,
    minAgeMonths: a.min_age_months,
    maxAgeMonths: a.max_age_months,
    requiredCapabilities: a.required_capabilities || [],
    optionalCapabilities: a.optional_capabilities || [],
    zpdTargets: a.zpd_targets || [],
    stimulationLevel: a.stimulation_level,
    requiredResources: a.required_resources || [],
    spaceRequirement: a.space_requirement || 'anywhere',
    minDurationMinutes: a.min_duration_minutes,
    maxDurationMinutes: a.max_duration_minutes,
    isBedtimeSafe: a.is_bedtime_safe,
    isSickDaySafe: a.is_sick_day_safe,
    isFallback: a.is_fallback,
    isActive: a.is_active,
  }
}

/** 已達成能力集合：capabilities JSONB 中值為 true 的 key。抽出以便單元測試。 */
export function acquiredFrom(
  capabilities: Record<string, unknown> | null | undefined,
): Set<string> {
  return new Set(Object.keys(capabilities || {}).filter((k) => capabilities?.[k] === true))
}

export class RecommendError extends Error {}

/**
 * 取得推薦活動（七步演算法）。失敗丟 RecommendError，畫面負責顯示。
 */
export async function fetchRecommendations(
  supabase: SupabaseClient,
  childId: string,
  inputs: RecommendInputs,
): Promise<RecommendedActivity[]> {
  const {
    parentEnergy,
    context,
    availableSpace,
    availableResources = [],
    maxDurationMinutes = 30,
    excludeIds = [],
  } = inputs

  // 取得孩子（RLS 過濾；查不到＝無權限或不存在）
  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .select('id,birth_year_month,stage_key')
    .eq('id', childId)
    .single()

  if (childError || !child) {
    throw new RecommendError('找不到孩子資料')
  }
  if (!child.birth_year_month) {
    throw new RecommendError('孩子的年齡資料不完整，請先補上出生年月')
  }

  let ageMonths: number
  try {
    ageMonths = getAgeMonths(child.birth_year_month)
  } catch {
    throw new RecommendError('孩子的出生年月格式不正確')
  }
  if (ageMonths < 0) {
    throw new RecommendError('孩子的出生年月不能在未來')
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  // 反應自適應用較長的窗（60 天）：偏好比「近期降權」存活更久。
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const [activitiesResult, recentLogsResult, capProfileResult, reactionLogsResult] =
    await Promise.all([
      supabase
        .from('companion_activities')
        .select(ACTIVITY_COLUMNS)
        .eq('is_active', true)
        .or(`min_age_months.is.null,min_age_months.lte.${ageMonths}`)
        .or(`max_age_months.is.null,max_age_months.gte.${ageMonths}`),
      supabase
        .from('companion_logs')
        .select('activity_id')
        .eq('child_id', childId)
        .gt('created_at', sevenDaysAgo)
        .limit(500),
      supabase
        .from('child_capability_profiles')
        .select('capabilities')
        .eq('child_id', childId)
        .single(),
      supabase
        .from('companion_logs')
        .select('activity_id,child_reaction')
        .eq('child_id', childId)
        .not('child_reaction', 'is', null)
        .gt('created_at', sixtyDaysAgo)
        .limit(500),
    ])

  if (activitiesResult.error) {
    throw new RecommendError('無法載入活動資料')
  }
  const rows = (activitiesResult.data || []) as ActivityRow[]

  const recentActivityIds = new Set(
    (recentLogsResult.data || []).map((l) => l.activity_id).filter(Boolean) as string[],
  )
  const acquiredCapabilities = acquiredFrom(
    capProfileResult.data?.capabilities as Record<string, unknown> | null,
  )
  // 反應自適應統計；無資料時為空 Map → 引擎略過 Step 8
  const reactionStats = buildReactionStats(
    (
      (reactionLogsResult.data || []) as {
        activity_id: string | null
        child_reaction: string | null
      }[]
    ).map((l) => ({ activityId: l.activity_id, reaction: l.child_reaction })),
  )

  // 驗證快取的 stage_key 在白名單內；否則由年齡重算
  const stageKey: StageKey = ALLOWED_STAGE_KEYS.includes(child.stage_key as StageKey)
    ? (child.stage_key as StageKey)
    : getStageKey(ageMonths)

  // 「換一批」：排除已看過（fallback 不排除，確保永遠有安全兜底）
  const excludeSet = new Set(excludeIds)
  const candidates =
    excludeSet.size > 0 ? rows.filter((a) => a.is_fallback || !excludeSet.has(a.id)) : rows

  // 發展領域不參與評分，但要回傳給前端做標籤
  const focusById = new Map<string, string[]>(
    candidates.map((a) => [a.id, a.developmental_focus || []]),
  )

  const recs = getRecommendations(
    candidates.map(mapActivityRow),
    {
      child: { id: childId, stageKey, ageMonths, acquiredCapabilities },
      parentEnergy,
      context,
      availableSpace,
      availableResources: new Set(availableResources),
      recentActivityIds,
      reactionStats,
      maxDurationMinutes,
    },
    3,
  )

  return recs.map((r) => ({
    id: r.id,
    title: r.title,
    score: r.score,
    reasons: r.reasons,
    minDurationMinutes: r.minDurationMinutes,
    maxDurationMinutes: r.maxDurationMinutes,
    stimulationLevel: r.stimulationLevel,
    developmentalFocus: focusById.get(r.id) || [],
  }))
}
