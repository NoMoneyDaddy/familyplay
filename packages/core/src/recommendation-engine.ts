import type { StageKey } from './stage-keys'
import { HIGH_RISK_STAGES, containsBlockedMaterial, hasBlockedContextKeyword, type CompanionContext } from './safety-rules'
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

export interface RecommendationContext {
  child: Child
  parentEnergy: ParentEnergy
  context: CompanionContext
  availableSpace: SpaceType
  availableResources: Set<string>
  recentActivityIds: Set<string>
  maxDurationMinutes: number
}

export interface ScoredActivity extends Activity {
  score: number
  reasons: string[]
}

// Step 1: Age safety filter
function filterByAgeSafety(activities: Activity[], child: Child): Activity[] {
  return activities.filter((a) => {
    if (a.minAgeMonths && child.ageMonths < a.minAgeMonths) return false
    if (a.maxAgeMonths && child.ageMonths > a.maxAgeMonths) return false
    if (HIGH_RISK_STAGES.includes(child.stageKey)) {
      const hasBlockedMaterial = a.requiredResources.some((r) =>
        containsBlockedMaterial(r, child.stageKey),
      )
      if (hasBlockedMaterial) return false
    }
    return true
  })
}

// Step 2: Context safety rules
function filterByContextSafety(activities: Activity[], context: RecommendationContext): Activity[] {
  return activities.filter((a) => {
    if (context.context === 'bedtime' && !a.isBedtimeSafe) return false
    if (context.context === 'sick_day' && !a.isSickDaySafe) return false
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
function scoreByZpd(activities: Activity[]): ScoredActivity[] {
  return activities.map((a) => ({
    ...a,
    score: a.zpdTargets.length > 0 ? 10 : 0,
    reasons: a.zpdTargets.length > 0 ? ['發展中能力加分'] : [],
  }))
}

// Step 5: Context and resource filtering
function filterByContext(
  activities: ScoredActivity[],
  context: RecommendationContext,
): ScoredActivity[] {
  return activities.filter((a) => {
    if (a.spaceRequirement !== 'anywhere' && a.spaceRequirement !== context.availableSpace) {
      return false
    }
    if (a.requiredResources.length > 0) {
      const hasResources = a.requiredResources.every((r) => context.availableResources.has(r))
      if (!hasResources) return false
    }
    if (a.minDurationMinutes > context.maxDurationMinutes) return false
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

export function getRecommendations(
  activities: Activity[],
  context: RecommendationContext,
  limit = 3,
): ScoredActivity[] {
  let filtered = activities.filter((a) => a.isActive)

  // Step 1–3: Filter chain
  filtered = filterByAgeSafety(filtered, context.child)
  filtered = filterByContextSafety(filtered, context)
  filtered = filterByCapabilities(filtered, context.child)

  // Step 4: ZPD scoring
  let scored = scoreByZpd(filtered)

  // Step 5: Context & resource filtering
  scored = filterByContext(scored, context)

  // Step 6: Priority sorting
  scored = scoreByPriority(scored)

  // Step 7: Recency penalty
  scored = applyRecencyPenalty(scored, context)

  return scored.slice(0, limit)
}
