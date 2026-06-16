import { describe, it, expect } from 'vitest'
import { getStageKey, getAgeMonths, STAGE_KEYS } from './stage-keys'

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
})

describe('getAgeMonths', () => {
  it('calculates age in months correctly', () => {
    const now = new Date()
    const twoYearsAgo = `${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const age = getAgeMonths(twoYearsAgo)
    expect(age).toBeCloseTo(24, 0)
  })
})
