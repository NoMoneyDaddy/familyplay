import { describe, expect, it } from 'vitest'
import { getAgeMonths, getAgeMonthsFromDate, getStageKey, STAGE_KEYS } from './stage-keys'

describe('getStageKey', () => {
  it('returns newborn for 0 months', () => {
    expect(getStageKey(0)).toBe(STAGE_KEYS.NEWBORN)
  })

  it('returns early_walker for 15 months', () => {
    expect(getStageKey(15)).toBe(STAGE_KEYS.EARLY_WALKER)
  })

  it('returns preschooler for 40 months', () => {
    expect(getStageKey(40)).toBe(STAGE_KEYS.PRESCHOOLER)
  })

  it('returns preschooler_plus for 55 months', () => {
    expect(getStageKey(55)).toBe(STAGE_KEYS.PRESCHOOLER_PLUS)
  })

  it('clamps ages at/above the top band to preschooler_plus', () => {
    expect(getStageKey(60)).toBe(STAGE_KEYS.PRESCHOOLER_PLUS)
    expect(getStageKey(200)).toBe(STAGE_KEYS.PRESCHOOLER_PLUS)
  })

  it('handles the 3-month boundary (exclusive upper bound)', () => {
    expect(getStageKey(3)).toBe(STAGE_KEYS.EARLY_INFANT)
  })

  it('returns newborn for NaN rather than misclassifying', () => {
    expect(getStageKey(Number.NaN)).toBe(STAGE_KEYS.NEWBORN)
  })

  it('clamps a negative age to newborn (never returns the top band)', () => {
    // A negative age (e.g. unvalidated/future birth date) must fail safe to the
    // youngest, most-restrictive stage — not the oldest band.
    expect(getStageKey(-1)).toBe(STAGE_KEYS.NEWBORN)
    expect(getStageKey(-120)).toBe(STAGE_KEYS.NEWBORN)
  })
})

describe('getAgeMonths', () => {
  it('calculates age in months correctly', () => {
    const now = new Date()
    const twoYearsAgo = `${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const age = getAgeMonths(twoYearsAgo)
    expect(age).toBeCloseTo(24, 0)
  })

  it('throws on malformed input instead of returning NaN', () => {
    expect(() => getAgeMonths('2024')).toThrow()
    expect(() => getAgeMonths('abc')).toThrow()
    expect(() => getAgeMonths('')).toThrow()
    // @ts-expect-error testing runtime guard against non-string
    expect(() => getAgeMonths(undefined)).toThrow()
  })

  it('throws on an out-of-range month', () => {
    expect(() => getAgeMonths('2024-13')).toThrow()
    expect(() => getAgeMonths('2024-00')).toThrow()
  })
})

describe('getAgeMonthsFromDate', () => {
  it('精確到日：尚未過當月「日」則不計該月', () => {
    const now = new Date()
    const y = now.getFullYear() - 1
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    // 出生「日」比今天大 → 這個月還沒過完，應為 11 個月而非 12
    const laterDay = String(Math.min(now.getDate() + 1, 28)).padStart(2, '0')
    if (now.getDate() + 1 <= 28) {
      expect(getAgeMonthsFromDate(`${y}-${mm}-${laterDay}`)).toBe(11)
    }
    // 出生「日」是 1 號（多半已過）→ 滿 12 個月
    expect(getAgeMonthsFromDate(`${y}-${mm}-01`)).toBe(12)
  })

  it('格式錯誤丟錯（非 NaN）', () => {
    expect(() => getAgeMonthsFromDate('2024-01')).toThrow()
    expect(() => getAgeMonthsFromDate('2024/01/01')).toThrow()
    expect(() => getAgeMonthsFromDate('')).toThrow()
  })
})
