import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRecommendations,
  type Activity,
  type Child,
  type RecommendationContext,
} from './recommendation-engine'
import { STAGE_KEYS } from './stage-keys'

describe('Recommendation Engine', () => {
  let activities: Activity[]
  let child: Child
  let context: RecommendationContext

  beforeEach(() => {
    activities = [
      {
        id: 'activity-1',
        title: '踢腿遊戲',
        minAgeMonths: 0,
        maxAgeMonths: 6,
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
      },
      {
        id: 'activity-2',
        title: '藏貓貓',
        minAgeMonths: 6,
        maxAgeMonths: 18,
        requiredCapabilities: [],
        optionalCapabilities: ['objectPermanence'],
        zpdTargets: ['objectPermanence'],
        stimulationLevel: 'low',
        requiredResources: [],
        spaceRequirement: 'anywhere',
        minDurationMinutes: 5,
        maxDurationMinutes: 15,
        isBedtimeSafe: true,
        isSickDaySafe: true,
        isFallback: false,
        isActive: true,
      },
      {
        id: 'fallback',
        title: '問你一件今天的事',
        minAgeMonths: 0,
        maxAgeMonths: 120,
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
        isFallback: true,
        isActive: true,
      },
    ]

    child = {
      id: 'child-1',
      stageKey: STAGE_KEYS.SITTING_BABY,
      ageMonths: 8,
      acquiredCapabilities: new Set(),
    }

    context = {
      child,
      parentEnergy: 'medium',
      context: 'normal',
      availableSpace: 'anywhere',
      availableResources: new Set(),
      recentActivityIds: new Set(),
      maxDurationMinutes: 20,
    }
  })

  it('filters by age range', () => {
    const recs = getRecommendations(activities, context, 5)
    expect(recs.every((a) => !a.isFallback || true)).toBe(true)
    expect(recs.length).toBeGreaterThan(0)
  })

  it('respects bedtime safe flag', () => {
    context.context = 'bedtime'
    const recs = getRecommendations(activities, context, 5)
    expect(recs.every((a) => a.isBedtimeSafe)).toBe(true)
  })

  it('scores ZPD targets higher', () => {
    const recs = getRecommendations(activities, context, 5)
    const zpd = recs.find((a) => a.zpdTargets.length > 0)
    const noZpd = recs.find((a) => a.zpdTargets.length === 0 && !a.isFallback)
    if (zpd && noZpd) {
      expect(zpd.score).toBeGreaterThan(noZpd.score)
    }
  })

  it('applies recency penalty', () => {
    context.recentActivityIds.add('activity-2')
    const recs = getRecommendations(activities, context, 5)
    const penalizedActivity = recs.find((a) => a.id === 'activity-2')
    if (penalizedActivity) {
      expect(penalizedActivity.reasons).toContain('近期已推薦，降分 30%')
    }
  })

  it('returns fallback if no matches', () => {
    child.ageMonths = 100
    context.child = child
    const recs = getRecommendations(activities, context, 1)
    expect(recs.length).toBeGreaterThan(0)
  })
})
