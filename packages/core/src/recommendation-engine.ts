import { ALLOWED_CAPABILITY_KEYS } from './capability-keys'
import {
  type CompanionContext,
  containsBlockedMaterial,
  FALLBACK_ACTIVITY,
  HIGH_RISK_STAGES,
  hasBlockedContextKeyword,
} from './safety-rules'
import { ALLOWED_STAGE_KEYS, getStageKey, type StageKey } from './stage-keys'
export type ParentEnergy = 'exhausted' | 'low' | 'medium' | 'high'
export type SpaceType = 'anywhere' | 'living_room' | 'bedroom' | 'outdoor' | 'kitchen'

export interface Activity {
  id: string
  title: string
  minAgeMonths: number
  maxAgeMonths: number
  requiredCapabilities: string[]
  optionalCapabilities: string[]
  zpdTargets: string[]
  stimulationLevel: 'low' | 'medium' | 'high'
  requiredResources: string[]
  spaceRequirement: SpaceType
  minDurationMinutes: number
  maxDurationMinutes: number
  isBedtimeSafe: boolean
  isSickDaySafe: boolean
  isFallback: boolean
  isActive: boolean
}

export interface Child {
  id: string
  stageKey: StageKey
  ageMonths: number
  acquiredCapabilities: Set<string>
}

// 孩子對某個活動的歷史反應統計（由 companion_logs 聚合）。
export type ChildReaction = 'happy' | 'engaged' | 'neutral' | 'leaving' | 'disinterested' | 'calmed'

export interface ActivityReactionStats {
  liked: number // happy / engaged / calmed
  disliked: number // leaving / disinterested（neutral 不計）
}

// 正向／負向反應分類——單一真實來源，Web 與行動端共用，避免兩邊各自硬編而漂移。
const POSITIVE_REACTIONS: ReadonlySet<string> = new Set(['happy', 'engaged', 'calmed'])
const NEGATIVE_REACTIONS: ReadonlySet<string> = new Set(['leaving', 'disinterested'])

/** 由原始反應紀錄聚合成 activityId → {liked, disliked}。neutral 與未知值忽略。 */
export function buildReactionStats(
  rows: { activityId: string | null | undefined; reaction: string | null | undefined }[],
): Map<string, ActivityReactionStats> {
  const stats = new Map<string, ActivityReactionStats>()
  for (const { activityId, reaction } of rows) {
    if (!activityId || !reaction) continue
    const isPos = POSITIVE_REACTIONS.has(reaction)
    const isNeg = NEGATIVE_REACTIONS.has(reaction)
    if (!isPos && !isNeg) continue
    const cur = stats.get(activityId) ?? { liked: 0, disliked: 0 }
    if (isPos) cur.liked += 1
    else cur.disliked += 1
    stats.set(activityId, cur)
  }
  return stats
}

export interface RecommendationContext {
  child: Child
  parentEnergy: ParentEnergy
  context: CompanionContext
  availableSpace: SpaceType
  availableResources: Set<string>
  recentActivityIds: Set<string>
  maxDurationMinutes: number
  // 選填：孩子對各活動的歷史反應。提供時啟用「自適應」個人化層（Step 8）；
  // 不提供則行為與原本完全相同（向後相容）。
  reactionStats?: Map<string, ActivityReactionStats>
}

export interface ScoredActivity extends Activity {
  score: number
  reasons: string[]
}

// Step 1: Age safety filter
function filterByAgeSafety(activities: Activity[], child: Child): Activity[] {
  return activities.filter((a) => {
    // Use explicit null checks so a legitimate 0 (e.g. minAgeMonths: 0) is respected.
    if (a.minAgeMonths != null && child.ageMonths < a.minAgeMonths) return false
    if (a.maxAgeMonths != null && child.ageMonths > a.maxAgeMonths) return false
    if (HIGH_RISK_STAGES.includes(child.stageKey)) {
      // Choking-hazard check: scan both listed resources AND the title, since a
      // hazardous material may be named in the title without a resource entry.
      const hasBlockedMaterial =
        a.requiredResources.some((r) => containsBlockedMaterial(r, child.stageKey)) ||
        containsBlockedMaterial(a.title, child.stageKey)
      if (hasBlockedMaterial) return false
    }
    return true
  })
}

// Step 2: Context safety rules
function filterByContextSafety(activities: Activity[], context: RecommendationContext): Activity[] {
  return activities.filter((a) => {
    if (context.context === 'bedtime') {
      // Bedtime excludes high-stimulation (structural, not just the flag/keyword).
      if (!a.isBedtimeSafe) return false
      if (a.stimulationLevel === 'high') return false
    }
    if (context.context === 'sick_day' && !a.isSickDaySafe) return false
    // Emotional crisis excludes high-stimulation / competitive activities.
    if (context.context === 'emotional_crisis' && a.stimulationLevel === 'high') return false
    if (hasBlockedContextKeyword(a.title, context.context)) return false
    return true
  })
}

// Step 3: Capability matching
function filterByCapabilities(activities: Activity[], child: Child): Activity[] {
  return activities.filter(
    (a) =>
      a.requiredCapabilities.length === 0 ||
      a.requiredCapabilities.every((cap) => child.acquiredCapabilities.has(cap)),
  )
}

// Step 4: ZPD scoring (Zone of Proximal Development)
// Only reward activities whose targets are capabilities the child has NOT yet
// acquired (i.e. genuinely in their developing edge), not any activity that
// merely declares zpdTargets.
function scoreByZpd(activities: Activity[], child: Child): ScoredActivity[] {
  return activities.map((a) => {
    const developing = a.zpdTargets.filter((t) => !child.acquiredCapabilities.has(t))
    const hasDeveloping = developing.length > 0
    return {
      ...a,
      score: hasDeveloping ? 10 : 0,
      reasons: hasDeveloping ? ['發展中能力加分'] : [],
    }
  })
}

// A drained parent shouldn't be handed a high-stimulation or long activity.
// Step 5 of the spec includes "parent state"; cap the minimum duration we'll
// offer per energy level (no cap for medium/high). The always-safe fallback
// still guarantees a result if this filters everything out.
const LOW_ENERGY_MAX_MINUTES: Partial<Record<ParentEnergy, number>> = {
  exhausted: 10,
  low: 15,
}

// Step 5: Context and resource filtering (space, resources, time, parent energy)
function filterByContext(
  activities: ScoredActivity[],
  context: RecommendationContext,
): ScoredActivity[] {
  // Keep the two concerns independent: a future energy level could cap duration
  // without excluding high-stimulation (or vice versa).
  const energyCap = LOW_ENERGY_MAX_MINUTES[context.parentEnergy]
  const shouldExcludeHighStimulation =
    context.parentEnergy === 'exhausted' || context.parentEnergy === 'low'
  return activities.filter((a) => {
    if (a.spaceRequirement !== 'anywhere' && a.spaceRequirement !== context.availableSpace) {
      return false
    }
    if (a.requiredResources.length > 0) {
      const hasResources = a.requiredResources.every((r) => context.availableResources.has(r))
      if (!hasResources) return false
    }
    if (a.minDurationMinutes > context.maxDurationMinutes) return false
    // Parent energy: drop high-stimulation and over-long activities when drained.
    if (shouldExcludeHighStimulation && a.stimulationLevel === 'high') return false
    if (energyCap != null && a.minDurationMinutes > energyCap) return false
    return true
  })
}

// Step 6: Sorting (cost, prep, duration)
function scoreByPriority(activities: ScoredActivity[]): ScoredActivity[] {
  return activities
    .map((a) => {
      let bonus = 0
      if (a.requiredResources.length === 0) bonus += 5 // Free
      if (a.minDurationMinutes <= 10) bonus += 3 // Short prep
      bonus -= (a.minDurationMinutes + a.maxDurationMinutes) / 20 // Longer = lower score
      return { ...a, score: a.score + bonus, reasons: [...a.reasons, '優先度調整'] }
    })
    .sort((x, y) => y.score - x.score)
}

// Step 7: Recency penalty
function applyRecencyPenalty(
  activities: ScoredActivity[],
  context: RecommendationContext,
): ScoredActivity[] {
  return activities.map((a) => {
    if (context.recentActivityIds.has(a.id)) {
      return {
        ...a,
        score: a.score * 0.7,
        reasons: [...a.reasons, '近期已推薦，降分 30%'],
      }
    }
    return a
  })
}

// Step 8 (additive personalization layer — does NOT reorder the canonical 7):
// reaction-driven affinity. Uses logged child reactions to nudge ranking toward
// what this child has enjoyed and away from what fell flat — the "learns what your
// child loves / adapts in real time" loop. Additive (same point system as ZPD /
// priority) so it's sign-safe even when a base score is negative. Only runs when
// reactionStats is supplied; otherwise a no-op (backward compatible).
const AFFINITY_POINTS_PER_NET = 2 // 每淨喜歡 +2 分
const AFFINITY_NET_CAP = 3 // 淨值上下限 ±3 → 影響上限 ±6 分
// 明確不喜歡（≥2 次負向且 0 正向）：直接給最大降幅。與加分上限同界（±6），維持加法計分一致。
const STRONG_DISLIKE_PENALTY = AFFINITY_POINTS_PER_NET * AFFINITY_NET_CAP // 6

function applyReactionAffinity(
  activities: ScoredActivity[],
  context: RecommendationContext,
): ScoredActivity[] {
  const stats = context.reactionStats
  if (!stats || stats.size === 0) return activities
  return activities.map((a) => {
    const s = stats.get(a.id)
    if (!s) return a
    const liked = Number.isFinite(s.liked) ? s.liked : 0
    const disliked = Number.isFinite(s.disliked) ? s.disliked : 0

    // 明確不喜歡：強力降分，讓引擎「換別的」（對應對手的 recalibrate 行為）
    if (disliked >= 2 && liked === 0) {
      return {
        ...a,
        score: a.score - STRONG_DISLIKE_PENALTY,
        reasons: [...a.reasons, '上次玩得不太順，先換別的'],
      }
    }

    const net = Math.max(-AFFINITY_NET_CAP, Math.min(AFFINITY_NET_CAP, liked - disliked))
    if (net === 0) return a
    const delta = net * AFFINITY_POINTS_PER_NET
    return {
      ...a,
      score: a.score + delta,
      reasons: [...a.reasons, net > 0 ? '孩子之前很喜歡，加分' : '孩子之前興趣缺缺，降分'],
    }
  })
}

// Safety boundary: the engine is the reusable choking/safety filter, called from
// multiple routes. Never trust the caller's stageKey or capability set — a
// malformed stageKey would make HIGH_RISK_STAGES.includes() return false and
// silently disable the under-3 small-parts filter. Re-derive on any mismatch and
// fall back to the most conservative (newborn = HIGH_RISK) assumption.
function normalizeChild(child: Child): Child {
  // Bad ageMonths (undefined/null/NaN) must NOT fall through getStageKey to
  // 'preschooler_plus' (non-high-risk) and re-open the choking bypass. Coerce to
  // 0 → newborn → HIGH_RISK (fail safe) before deriving.
  const ageMonths = Number.isFinite(child.ageMonths) ? child.ageMonths : 0
  const stageKey = ALLOWED_STAGE_KEYS.includes(child.stageKey)
    ? child.stageKey
    : getStageKey(ageMonths)
  // A non-iterable acquiredCapabilities (e.g. a plain object from JSON) would
  // throw on spread and crash the request — guard before iterating.
  const rawCaps =
    typeof child.acquiredCapabilities?.[Symbol.iterator] === 'function'
      ? [...child.acquiredCapabilities]
      : []
  const acquiredCapabilities = new Set(
    rawCaps.filter((c) => (ALLOWED_CAPABILITY_KEYS as string[]).includes(c)),
  )
  return { ...child, ageMonths, stageKey, acquiredCapabilities }
}

// DB rows aren't validated against the TS types at runtime. A NaN/undefined
// duration poisons score arithmetic and makes the entire .sort() non-deterministic
// (NaN comparisons). Coerce numeric fields to finite values before scoring.
function normalizeActivity(a: Activity): Activity {
  const min = Number.isFinite(a.minDurationMinutes) ? a.minDurationMinutes : 1
  const max = Number.isFinite(a.maxDurationMinutes) ? a.maxDurationMinutes : min
  return {
    ...a,
    minDurationMinutes: min,
    maxDurationMinutes: Math.max(min, max),
    minAgeMonths: Number.isFinite(a.minAgeMonths) ? a.minAgeMonths : 0,
    // Bad maxAge → 0 so only age 0 passes: fail closed rather than match everyone.
    maxAgeMonths: Number.isFinite(a.maxAgeMonths) ? a.maxAgeMonths : 0,
  }
}

export function getRecommendations(
  activities: Activity[],
  rawContext: RecommendationContext,
  limit = 3,
): ScoredActivity[] {
  const context: RecommendationContext = {
    ...rawContext,
    child: normalizeChild(rawContext.child),
  }
  let filtered = activities.map(normalizeActivity).filter((a) => a.isActive)

  // Step 1–3: Filter chain
  filtered = filterByAgeSafety(filtered, context.child)
  filtered = filterByContextSafety(filtered, context)
  filtered = filterByCapabilities(filtered, context.child)

  // Step 4: ZPD scoring
  let scored = scoreByZpd(filtered, context.child)

  // Step 5: Context & resource filtering
  scored = filterByContext(scored, context)

  // Step 6: Priority sorting
  scored = scoreByPriority(scored)

  // Step 7: Recency penalty
  scored = applyRecencyPenalty(scored, context)

  // Step 8: Reaction-driven affinity (additive personalization; no-op without data)
  scored = applyReactionAffinity(scored, context)

  // RE-SORT after the score adjustments so they actually change ranking.
  scored = scored.sort((x, y) => y.score - x.score)

  const result = scored.slice(0, limit)

  // Product guarantee: never return nothing. If everything was filtered out,
  // surface the always-safe fallback activity.
  if (result.length === 0) {
    return [buildFallbackScored()]
  }
  return result
}

// Maps the safe FALLBACK_ACTIVITY into a full ScoredActivity.
function buildFallbackScored(): ScoredActivity {
  return {
    id: FALLBACK_ACTIVITY.id,
    title: FALLBACK_ACTIVITY.title,
    minAgeMonths: 0,
    maxAgeMonths: 9999,
    requiredCapabilities: [],
    optionalCapabilities: [],
    zpdTargets: [],
    stimulationLevel: 'low',
    requiredResources: [],
    spaceRequirement: 'anywhere',
    minDurationMinutes: 1,
    maxDurationMinutes: 10,
    isBedtimeSafe: true,
    isSickDaySafe: true,
    isFallback: true,
    isActive: true,
    score: 0,
    reasons: ['安全回退方案'],
  }
}
