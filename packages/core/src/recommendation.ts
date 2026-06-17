// 推薦引擎七步 —— 純 TS，無外部依賴
//
// 順序固定，不能改變（見 CLAUDE.md）：
//   1. 年齡安全過濾    排除危險活動，0–3 歲禁止小零件
//   2. 情境安全規則    睡前排除高刺激，情緒排除競賽
//   3. 能力匹配過濾    requiredCapabilities ⊆ 孩子已達能力
//   4. ZPD 評分        發展中能力的活動加分
//   5. 情境過濾        家長狀態、場景、資源、時間
//   6. 優先排序        零花費 > 低收拾 > 短準備時間
//   7. 歷史降權        近 7 天出現過的活動降 30% 分數

import type { CapabilityKey } from './capability-keys'
import {
  type CompanionContext,
  FALLBACK_ACTIVITY,
  containsBlockedMaterial,
  hasBlockedContextKeyword,
} from './safety-rules'
import type { StageKey } from './stage-keys'

export type StimulationLevel = 'low' | 'medium' | 'high'
export type ParentEnergy = 'low' | 'medium' | 'high'
export type CostLevel = 'free' | 'low' | 'paid'
export type CleanupLevel = 'none' | 'low' | 'high'

/** 一個陪伴活動模板（對應資料表 companion_activities） */
export interface Activity {
  id: string
  title: string
  openingLine: string
  steps: string[]
  description?: string
  safetyNotes?: string

  /** 年齡邊界（含），未設定代表不限制該邊界 */
  minAgeMonths?: number
  maxAgeMonths?: number

  requiredCapabilities: CapabilityKey[]
  optionalCapabilities?: CapabilityKey[]
  zpdTargets?: CapabilityKey[]

  stimulationLevel: StimulationLevel
  /** 需要的資源 key；空陣列代表不需任何資源 */
  requiredResources: string[]
  /** 'anywhere' 代表任何場景皆可 */
  spaceRequirement: string
  minDurationMinutes: number
  maxDurationMinutes: number

  isBedtimeSafe?: boolean
  isSickDaySafe?: boolean
  companionType?: string

  costLevel?: CostLevel
  cleanupLevel?: CleanupLevel
  /** 準備時間（分鐘），越低越優先 */
  prepMinutes?: number

  isFallback?: boolean
  isActive?: boolean
}

export interface RecommendationContext {
  ageMonths: number
  stageKey: StageKey
  achievedCapabilities: CapabilityKey[]
  /** 發展中能力（ZPD），由 assessment 推算後傳入 */
  zpdTargets?: CapabilityKey[]
  parentEnergy: ParentEnergy
  companionContext: CompanionContext
  space: string
  /** 可用資源 key；空陣列或 ['none'] 代表沒有任何道具 */
  availableResources: string[]
  availableMinutes: number
  /** 近 7 天出現過的活動 id（用於歷史降權） */
  recentActivityIds?: string[]
}

export interface ScoredActivity {
  activity: Activity
  score: number
  reasons: string[]
}

export interface RecommendationResult {
  recommendations: ScoredActivity[]
  /** 是否所有活動都被過濾掉、改用保底活動 */
  usedFallback: boolean
}

const BASE_SCORE = 100
const ZPD_BONUS = 25
const OPTIONAL_CAP_BONUS = 8
const ENERGY_MATCH_BONUS = 15
const HISTORY_PENALTY_FACTOR = 0.7 // 降 30%

const COST_SCORE: Record<CostLevel, number> = { free: 30, low: 12, paid: 0 }
const CLEANUP_SCORE: Record<CleanupLevel, number> = { none: 20, low: 8, high: 0 }

/** 把活動所有文字欄位串起來，供安全關鍵字掃描 */
function activityText(activity: Activity): string {
  return [
    activity.title,
    activity.openingLine,
    activity.description ?? '',
    activity.safetyNotes ?? '',
    activity.steps.join(' '),
    activity.requiredResources.join(' '),
  ].join(' ')
}

// ── Step 1：年齡安全過濾 ──
function passesAgeSafety(activity: Activity, ctx: RecommendationContext): boolean {
  if (activity.isActive === false) return false
  if (activity.minAgeMonths != null && ctx.ageMonths < activity.minAgeMonths) return false
  if (activity.maxAgeMonths != null && ctx.ageMonths > activity.maxAgeMonths) return false
  // 0–3 歲禁止小零件等窒息風險材料
  if (containsBlockedMaterial(activityText(activity), ctx.stageKey)) return false
  return true
}

// ── Step 2：情境安全規則 ──
function passesContextSafety(activity: Activity, ctx: RecommendationContext): boolean {
  const context = ctx.companionContext
  if (context === 'normal') return true

  // 睡前 / 生病日排除高刺激
  if ((context === 'bedtime' || context === 'sick_day') && activity.stimulationLevel === 'high') {
    return false
  }
  // 明確標記不適合睡前 / 生病的活動
  if (context === 'bedtime' && activity.isBedtimeSafe === false) return false
  if (context === 'sick_day' && activity.isSickDaySafe === false) return false
  // 關鍵字過濾（競賽、跑跳、高刺激…）
  if (hasBlockedContextKeyword(activityText(activity), context)) return false
  return true
}

// ── Step 3：能力匹配過濾（requiredCapabilities ⊆ 已達能力）──
function passesCapabilityMatch(activity: Activity, achieved: Set<CapabilityKey>): boolean {
  return activity.requiredCapabilities.every((cap) => achieved.has(cap))
}

// ── Step 5：情境過濾（場景、資源、時間、家長狀態）──
function passesSituation(activity: Activity, ctx: RecommendationContext): boolean {
  // 場景：anywhere 通吃，否則須符合
  if (activity.spaceRequirement !== 'anywhere' && activity.spaceRequirement !== ctx.space) {
    return false
  }
  // 時間：活動最短時間須能塞進可用時間
  if (activity.minDurationMinutes > ctx.availableMinutes) return false
  // 資源：所需資源須全部可用（'none' 視為無需求）
  const available = new Set(ctx.availableResources)
  const needsResources = activity.requiredResources.filter((r) => r && r !== 'none')
  if (needsResources.some((r) => !available.has(r))) return false
  // 家長低電量：排除高刺激（需要家長大量參與）的活動
  if (ctx.parentEnergy === 'low' && activity.stimulationLevel === 'high') return false
  return true
}

// ── Step 4 + 6：評分（ZPD 加分 + 優先排序權重）──
function scoreBeforeHistory(activity: Activity, ctx: RecommendationContext): ScoredActivity {
  let score = BASE_SCORE
  const reasons: string[] = []

  // Step 4：ZPD —— 命中發展中能力加分
  const zpd = new Set(ctx.zpdTargets ?? [])
  if (zpd.size > 0) {
    const hits = (activity.zpdTargets ?? []).filter((t) => zpd.has(t))
    if (hits.length > 0) {
      score += hits.length * ZPD_BONUS
      reasons.push(`促進發展中能力 ×${hits.length}`)
    }
  }
  // 額外命中孩子已選用能力的活動略加分（更貼合）
  const achieved = new Set(ctx.achievedCapabilities)
  const optionalHits = (activity.optionalCapabilities ?? []).filter((c) => achieved.has(c))
  if (optionalHits.length > 0) {
    score += optionalHits.length * OPTIONAL_CAP_BONUS
  }

  // Step 6：優先排序 —— 零花費 > 低收拾 > 短準備時間
  if (activity.costLevel) {
    score += COST_SCORE[activity.costLevel]
    if (activity.costLevel === 'free') reasons.push('零花費')
  }
  if (activity.cleanupLevel) {
    score += CLEANUP_SCORE[activity.cleanupLevel]
    if (activity.cleanupLevel === 'none') reasons.push('免收拾')
  }
  if (activity.prepMinutes != null) {
    score -= activity.prepMinutes * 2
    if (activity.prepMinutes === 0) reasons.push('免準備')
  }

  // 家長電量與刺激度匹配
  if (ctx.parentEnergy === 'low' && activity.stimulationLevel === 'low') {
    score += ENERGY_MATCH_BONUS
    reasons.push('適合低電量家長')
  }
  if (ctx.parentEnergy === 'high' && activity.stimulationLevel === 'high') {
    score += ENERGY_MATCH_BONUS
  }

  return { activity, score, reasons }
}

function normalizedFallback(): Activity {
  return {
    id: FALLBACK_ACTIVITY.id,
    title: FALLBACK_ACTIVITY.title,
    openingLine: FALLBACK_ACTIVITY.openingLine,
    steps: [...FALLBACK_ACTIVITY.steps],
    requiredCapabilities: [],
    stimulationLevel: FALLBACK_ACTIVITY.stimulationLevel,
    requiredResources: [],
    spaceRequirement: 'anywhere',
    minDurationMinutes: 5,
    maxDurationMinutes: 10,
    costLevel: 'free',
    cleanupLevel: 'none',
    prepMinutes: 0,
    isFallback: true,
    isActive: true,
  }
}

/**
 * 推薦引擎主入口。永遠回傳至少一個結果（保底活動），絕不回傳空陣列。
 *
 * @param activities 候選活動（通常來自 companion_activities 資料表）
 * @param ctx        家長當下情境
 * @param limit      最多回傳幾筆（預設 3）
 */
export function recommend(
  activities: Activity[],
  ctx: RecommendationContext,
  limit = 3,
): RecommendationResult {
  const achieved = new Set(ctx.achievedCapabilities)
  const recent = new Set(ctx.recentActivityIds ?? [])

  const surviving = activities.filter(
    (a) =>
      passesAgeSafety(a, ctx) &&
      passesContextSafety(a, ctx) &&
      passesCapabilityMatch(a, achieved) &&
      passesSituation(a, ctx),
  )

  if (surviving.length === 0) {
    const fallback = scoreBeforeHistory(normalizedFallback(), ctx)
    fallback.reasons.unshift('保底方案')
    return { recommendations: [fallback], usedFallback: true }
  }

  const scored = surviving.map((activity) => {
    const result = scoreBeforeHistory(activity, ctx)
    // Step 7：歷史降權
    if (recent.has(activity.id)) {
      result.score = Math.round(result.score * HISTORY_PENALTY_FACTOR)
      result.reasons.push('近期出現過（降權）')
    }
    return result
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.activity.id.localeCompare(b.activity.id) // 穩定排序
  })

  return { recommendations: scored.slice(0, limit), usedFallback: false }
}
