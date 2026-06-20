import { describe, expect, it } from 'vitest'
import { computeStreak, toLocalDate } from './streak'

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-06-20', '2026-06-19', '2026-06-18'], '2026-06-20')).toBe(3)
  })

  it('keeps the streak alive if today has no log yet but yesterday does', () => {
    // 今天還沒陪，但昨天有 → streak 仍延續（給家長一整天可維持）
    expect(computeStreak(['2026-06-19', '2026-06-18'], '2026-06-20')).toBe(2)
  })

  it('is 0 when neither today nor yesterday has a log', () => {
    expect(computeStreak(['2026-06-17', '2026-06-16'], '2026-06-20')).toBe(0)
  })

  it('stops at the first gap', () => {
    expect(computeStreak(['2026-06-20', '2026-06-19', '2026-06-17'], '2026-06-20')).toBe(2)
  })

  it('dedupes multiple logs on the same day', () => {
    expect(
      computeStreak(['2026-06-20', '2026-06-20', '2026-06-19', '2026-06-19'], '2026-06-20'),
    ).toBe(2)
  })

  it('crosses month boundaries correctly', () => {
    expect(computeStreak(['2026-07-01', '2026-06-30', '2026-06-29'], '2026-07-01')).toBe(3)
  })

  it('returns 0 for empty input', () => {
    expect(computeStreak([], '2026-06-20')).toBe(0)
  })
})

describe('toLocalDate', () => {
  it('formats an ISO timestamp into a YYYY-MM-DD local date (Asia/Taipei)', () => {
    // 2026-06-20T15:30:00Z → 台北（UTC+8）為隔日 2026-06-20 23:30 → 同日
    expect(toLocalDate('2026-06-20T15:30:00Z', 'Asia/Taipei')).toBe('2026-06-20')
    // 2026-06-20T17:00:00Z → 台北為 2026-06-21 01:00 → 跨日
    expect(toLocalDate('2026-06-20T17:00:00Z', 'Asia/Taipei')).toBe('2026-06-21')
  })
})
