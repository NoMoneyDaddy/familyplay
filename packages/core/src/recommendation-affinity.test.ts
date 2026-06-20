import { describe, expect, it } from 'vitest'
import {
  type Activity,
  buildReactionStats,
  type Child,
  getRecommendations,
  type RecommendationContext,
} from './recommendation-engine'
import { STAGE_KEYS } from './stage-keys'

// 兩個除了 id 以外完全相同的活動 → 在無個人化時分數相同，
// 方便獨立驗證 Step 8 反應自適應對「排序」的影響。
function makeActivity(id: string): Activity {
  return {
    id,
    title: `活動-${id}`,
    minAgeMonths: 0,
    maxAgeMonths: 36,
    requiredCapabilities: [],
    optionalCapabilities: [],
    zpdTargets: [],
    stimulationLevel: 'low',
    requiredResources: [],
    spaceRequirement: 'anywhere',
    minDurationMinutes: 5,
    maxDurationMinutes: 10,
    isBedtimeSafe: true,
    isSickDaySafe: true,
    isFallback: false,
    isActive: true,
  }
}

const child: Child = {
  id: 'c1',
  stageKey: STAGE_KEYS.TODDLER_PLAYER,
  ageMonths: 30,
  acquiredCapabilities: new Set(),
}

function baseContext(over: Partial<RecommendationContext> = {}): RecommendationContext {
  return {
    child,
    parentEnergy: 'medium',
    context: 'normal',
    availableSpace: 'anywhere',
    availableResources: new Set(),
    recentActivityIds: new Set(),
    maxDurationMinutes: 30,
    ...over,
  }
}

const scoreOf = (recs: { id: string; score: number }[], id: string) =>
  recs.find((r) => r.id === id)?.score

describe('buildReactionStats', () => {
  it('classifies positive / negative and ignores neutral & unknown', () => {
    const stats = buildReactionStats([
      { activityId: 'a', reaction: 'happy' },
      { activityId: 'a', reaction: 'engaged' },
      { activityId: 'a', reaction: 'calmed' },
      { activityId: 'a', reaction: 'leaving' },
      { activityId: 'a', reaction: 'neutral' }, // 忽略
      { activityId: 'a', reaction: 'garbage' }, // 忽略
    ])
    expect(stats.get('a')).toEqual({ liked: 3, disliked: 1 })
  })

  it('skips rows with null/undefined ids or reactions', () => {
    const stats = buildReactionStats([
      { activityId: null, reaction: 'happy' },
      { activityId: 'a', reaction: null },
      { activityId: undefined, reaction: undefined },
    ])
    expect(stats.size).toBe(0)
  })
})

describe('Step 8 — reaction-driven affinity', () => {
  it('is a no-op when no reactionStats are supplied (backward compatible)', () => {
    const acts = [makeActivity('x'), makeActivity('y')]
    const recs = getRecommendations(acts, baseContext(), 5)
    expect(scoreOf(recs, 'x')).toBe(scoreOf(recs, 'y'))
  })

  it('ranks a liked activity above an identical neutral one', () => {
    const acts = [makeActivity('liked'), makeActivity('plain')]
    const stats = buildReactionStats([
      { activityId: 'liked', reaction: 'happy' },
      { activityId: 'liked', reaction: 'engaged' },
    ])
    const recs = getRecommendations(acts, baseContext({ reactionStats: stats }), 5)
    expect(scoreOf(recs, 'liked')).toBeGreaterThan(scoreOf(recs, 'plain') as number)
    expect(recs[0].id).toBe('liked')
  })

  it('strongly down-weights an activity the child clearly disliked', () => {
    const acts = [makeActivity('disliked'), makeActivity('plain')]
    const stats = buildReactionStats([
      { activityId: 'disliked', reaction: 'leaving' },
      { activityId: 'disliked', reaction: 'disinterested' },
    ])
    const recs = getRecommendations(acts, baseContext({ reactionStats: stats }), 5)
    expect(scoreOf(recs, 'disliked')).toBeLessThan(scoreOf(recs, 'plain') as number)
    expect(recs[0].id).toBe('plain')
    expect(recs.find((r) => r.id === 'disliked')?.reasons).toContain('上次玩得不太順，先換別的')
    // 鎖定強負反饋降幅邊界（與加分上限同界 ±6），防 Step 8 權重回歸
    const plain = getRecommendations([makeActivity('disliked')], baseContext(), 5)
    expect(
      (scoreOf(plain, 'disliked') as number) - (scoreOf(recs, 'disliked') as number),
    ).toBeCloseTo(6, 5)
  })

  it('caps the boost so a single hit cannot dominate safety/ZPD ordering wildly', () => {
    const acts = [makeActivity('a')]
    const many = Array.from({ length: 10 }, () => ({ activityId: 'a', reaction: 'happy' }))
    const stats = buildReactionStats(many)
    const recs = getRecommendations(acts, baseContext({ reactionStats: stats }), 5)
    const plain = getRecommendations([makeActivity('a')], baseContext(), 5)
    // 淨值上限 3 → 影響上限 +6 分（10 次喜歡不會無限加分）
    expect((scoreOf(recs, 'a') as number) - (scoreOf(plain, 'a') as number)).toBeCloseTo(6, 5)
  })
})
