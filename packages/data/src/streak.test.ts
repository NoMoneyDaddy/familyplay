import { describe, expect, it } from 'vitest'
import { computeStreak, computeStreakInfo, toLocalDate } from './streak'

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-06-20', '2026-06-19', '2026-06-18'], '2026-06-20')).toBe(3)
  })

  it('keeps the streak alive if today has no log yet but yesterday does', () => {
    // 今天還沒陪，但昨天有 → streak 仍延續（給家長一整天可維持）
    expect(computeStreak(['2026-06-19', '2026-06-18'], '2026-06-20')).toBe(2)
  })

  it('is 0 when neither today nor yesterday has a log（且超過寬限）', () => {
    // 連兩天沒紀錄（含寬限可補的昨天也沒）→ 超過一天寬限 → 0
    expect(computeStreak(['2026-06-16', '2026-06-15'], '2026-06-20')).toBe(0)
  })

  it('一天寬限：中間漏一天不歸零（漏的那天不計入）', () => {
    // 06-18 漏接，但前後都有 → streak = 06-20,06-19,(跳 06-18),06-17 = 3
    expect(computeStreak(['2026-06-20', '2026-06-19', '2026-06-17'], '2026-06-20')).toBe(3)
  })

  it('連續漏兩天（超過寬限）→ 在缺口處中斷', () => {
    // 06-18、06-17 都漏 → 寬限只能補一天 → streak = 06-20,06-19 = 2
    expect(computeStreak(['2026-06-20', '2026-06-19', '2026-06-16'], '2026-06-20')).toBe(2)
  })

  it('grace=0 時回到嚴格行為（第一個缺口即停）', () => {
    expect(computeStreak(['2026-06-20', '2026-06-19', '2026-06-17'], '2026-06-20', 0)).toBe(2)
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

describe('computeStreakInfo — graceUsed 旗標', () => {
  it('全連續 → graceUsed false', () => {
    expect(computeStreakInfo(['2026-06-20', '2026-06-19'], '2026-06-20')).toEqual({
      streak: 2,
      graceUsed: false,
    })
  })

  it('中間漏一天且被橋接 → graceUsed true', () => {
    expect(computeStreakInfo(['2026-06-20', '2026-06-18'], '2026-06-20')).toEqual({
      streak: 2,
      graceUsed: true,
    })
  })

  it('結尾無效寬限（後面沒接到）→ graceUsed false', () => {
    expect(computeStreakInfo(['2026-06-20'], '2026-06-20')).toEqual({
      streak: 1,
      graceUsed: false,
    })
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
