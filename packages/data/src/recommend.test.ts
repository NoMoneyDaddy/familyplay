import { describe, expect, it } from 'vitest'
import { type ActivityRow, acquiredFrom, mapActivityRow } from './recommend'

const baseRow: ActivityRow = {
  id: 'a1',
  title: '堆積木',
  min_age_months: 12,
  max_age_months: 36,
  required_capabilities: null,
  optional_capabilities: null,
  zpd_targets: null,
  developmental_focus: ['fine_motor'],
  stimulation_level: 'medium',
  required_resources: null,
  space_requirement: null,
  min_duration_minutes: 5,
  max_duration_minutes: 15,
  is_bedtime_safe: false,
  is_sick_day_safe: true,
  is_fallback: false,
  is_active: true,
}

describe('mapActivityRow', () => {
  it('maps snake_case DB row to camelCase engine Activity', () => {
    const a = mapActivityRow(baseRow)
    expect(a.id).toBe('a1')
    expect(a.minAgeMonths).toBe(12)
    expect(a.maxAgeMonths).toBe(36)
    expect(a.stimulationLevel).toBe('medium')
    expect(a.isSickDaySafe).toBe(true)
    expect(a.isBedtimeSafe).toBe(false)
  })

  it('defaults nullable arrays to [] and space to anywhere', () => {
    const a = mapActivityRow(baseRow)
    expect(a.requiredCapabilities).toEqual([])
    expect(a.optionalCapabilities).toEqual([])
    expect(a.zpdTargets).toEqual([])
    expect(a.requiredResources).toEqual([])
    expect(a.spaceRequirement).toBe('anywhere')
  })

  it('preserves an explicit space_requirement', () => {
    expect(mapActivityRow({ ...baseRow, space_requirement: 'outdoor' }).spaceRequirement).toBe(
      'outdoor',
    )
  })
})

describe('acquiredFrom', () => {
  it('returns only keys whose value is strictly true', () => {
    const set = acquiredFrom({ walks: true, crawls: false, talks: true })
    expect([...set].sort()).toEqual(['talks', 'walks'])
  })

  it('ignores truthy-but-not-true values', () => {
    // 防呆：JSONB 可能殘留非布林值，只認 === true
    const set = acquiredFrom({ a: 1, b: 'yes', c: true })
    expect([...set]).toEqual(['c'])
  })

  it('handles null/undefined as empty', () => {
    expect(acquiredFrom(null).size).toBe(0)
    expect(acquiredFrom(undefined).size).toBe(0)
  })
})
