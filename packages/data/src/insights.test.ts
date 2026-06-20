import { describe, expect, it } from 'vitest'
import { computeWeeklyInsights, type InsightRow } from './insights'

const row = (localDate: string, title: string, reaction: string | null): InsightRow => ({
  localDate,
  title,
  reaction,
})

describe('computeWeeklyInsights', () => {
  it('counts sessions and distinct active days', () => {
    const out = computeWeeklyInsights([
      row('2026-06-20', 'A', 'happy'),
      row('2026-06-20', 'B', 'neutral'),
      row('2026-06-19', 'A', 'engaged'),
    ])
    expect(out.sessions).toBe(3)
    expect(out.activeDays).toBe(2)
  })

  it('picks the most-logged activity (first on tie)', () => {
    const out = computeWeeklyInsights([
      row('2026-06-20', 'A', null),
      row('2026-06-20', 'B', null),
      row('2026-06-19', 'A', null),
    ])
    expect(out.topActivityTitle).toBe('A')
  })

  it('computes positive reaction rate over recorded reactions only', () => {
    const out = computeWeeklyInsights([
      row('2026-06-20', 'A', 'happy'), // positive
      row('2026-06-20', 'B', 'engaged'), // positive
      row('2026-06-19', 'C', 'leaving'), // negative
      row('2026-06-19', 'D', null), // 不計入分母
    ])
    expect(out.positiveReactionRate).toBeCloseTo(2 / 3, 5)
  })

  it('treats calmed as positive', () => {
    const out = computeWeeklyInsights([row('2026-06-20', 'A', 'calmed')])
    expect(out.positiveReactionRate).toBe(1)
  })

  it('returns null positiveReactionRate when no reactions recorded', () => {
    const out = computeWeeklyInsights([row('2026-06-20', 'A', null)])
    expect(out.positiveReactionRate).toBeNull()
  })

  it('handles empty input', () => {
    expect(computeWeeklyInsights([])).toEqual({
      sessions: 0,
      activeDays: 0,
      topActivityTitle: null,
      positiveReactionRate: null,
    })
  })
})
