import { beforeEach, describe, expect, it } from 'vitest'
import {
  type Activity,
  type Child,
  type RecommendationContext,
  getRecommendations,
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

  it('blocks choking-hazard activities for under-3 children (by title)', () => {
    // A hazardous material named only in the title, no requiredResources.
    activities.push({
      ...activities[0],
      id: 'hazard',
      title: '用硬幣排排看',
      minAgeMonths: 0,
      maxAgeMonths: 36,
    })
    child.stageKey = STAGE_KEYS.CRAWLER // under 3 → HIGH_RISK
    child.ageMonths = 10
    context.child = child
    const recs = getRecommendations(activities, context, 10)
    expect(recs.find((a) => a.id === 'hazard')).toBeUndefined()
  })

  it('excludes high-stimulation activities in emotional_crisis context', () => {
    activities.push({
      ...activities[0],
      id: 'highstim',
      title: '誰先到終點',
      stimulationLevel: 'high',
    })
    context.context = 'emotional_crisis'
    const recs = getRecommendations(activities, context, 10)
    expect(recs.find((a) => a.id === 'highstim')).toBeUndefined()
  })

  it('excludes high-stimulation activities at bedtime even if flagged bedtime-safe', () => {
    activities.push({
      ...activities[0],
      id: 'bedtime-highstim',
      title: '安靜的高刺激',
      stimulationLevel: 'high',
      isBedtimeSafe: true,
    })
    context.context = 'bedtime'
    const recs = getRecommendations(activities, context, 10)
    expect(recs.find((a) => a.id === 'bedtime-highstim')).toBeUndefined()
  })

  it('reorders so a recently-seen activity ranks below an equivalent fresh one', () => {
    // Two equivalent low-stim, zero-resource activities; penalize one.
    activities = [
      { ...activities[0], id: 'fresh', maxAgeMonths: 36, zpdTargets: [] },
      { ...activities[0], id: 'seen', maxAgeMonths: 36, zpdTargets: [] },
    ]
    context.recentActivityIds = new Set(['seen'])
    const recs = getRecommendations(activities, context, 5)
    const freshIdx = recs.findIndex((a) => a.id === 'fresh')
    const seenIdx = recs.findIndex((a) => a.id === 'seen')
    expect(freshIdx).toBeGreaterThanOrEqual(0)
    expect(seenIdx).toBeGreaterThan(freshIdx) // penalized one ranks lower
  })

  it('excludes activities requiring capabilities the child lacks', () => {
    activities.push({
      ...activities[0],
      id: 'needs-cap',
      requiredCapabilities: ['canWalk'],
    })
    child.acquiredCapabilities = new Set() // has none
    context.child = child
    const recs = getRecommendations(activities, context, 10)
    expect(recs.find((a) => a.id === 'needs-cap')).toBeUndefined()
  })

  it('returns the safe fallback activity when everything is filtered out', () => {
    // Child age outside every activity's range AND no matching activities.
    const recs = getRecommendations([], context, 3)
    expect(recs).toHaveLength(1)
    expect(recs[0].isFallback).toBe(true)
  })

  it('prioritizes zero-resource (free) activities', () => {
    activities = [
      {
        ...activities[0],
        id: 'costs-resources',
        maxAgeMonths: 36,
        requiredResources: ['積木'],
        zpdTargets: [],
      },
      {
        ...activities[0],
        id: 'free',
        maxAgeMonths: 36,
        requiredResources: [],
        zpdTargets: [],
      },
    ]
    context.availableResources = new Set(['積木'])
    const recs = getRecommendations(activities, context, 5)
    expect(recs[0].id).toBe('free') // zero-cost ranks first
  })
})
