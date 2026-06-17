import { describe, expect, it } from 'vitest'
import { STAGE_KEYS, getAgeMonths, getStageKey } from './stage-keys'

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

  it('throws RangeError for NaN', () => {
    expect(() => getStageKey(Number.NaN)).toThrow(RangeError)
  })

  it('throws RangeError for Infinity', () => {
    expect(() => getStageKey(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('getAgeMonths', () => {
  it('calculates age in months correctly', () => {
    const now = new Date()
    const twoYearsAgo = `${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const age = getAgeMonths(twoYearsAgo)
    expect(age).toBeCloseTo(24, 0)
  })

  it('throws RangeError for empty string', () => {
    expect(() => getAgeMonths('')).toThrow(RangeError)
  })

  it('throws RangeError for invalid format', () => {
    expect(() => getAgeMonths('2024/01')).toThrow(RangeError)
  })

  it('throws RangeError for invalid month 00', () => {
    expect(() => getAgeMonths('2020-00')).toThrow(RangeError)
  })

  it('throws RangeError for invalid month 13', () => {
    expect(() => getAgeMonths('2020-13')).toThrow(RangeError)
  })

  it('throws RangeError for future date', () => {
    expect(() => getAgeMonths('2099-01')).toThrow(RangeError)
  })
})
