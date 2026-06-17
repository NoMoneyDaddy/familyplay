import { describe, expect, it } from 'vitest'
import { type ActivityRow, mapRowToActivity } from './activities'

const fallbackRow: ActivityRow = {
  id: 'e45cdd75-2346-4e21-82ad-7fbdc0081591',
  title: '問你一件今天的事',
  opening_line: '你今天有什麼讓你開心的事嗎？',
  steps: ['坐在孩子旁邊', '說出開口第一句', '認真聽，點頭，不評判'],
  description: null,
  safety_notes: null,
  min_age_months: null,
  max_age_months: null,
  required_capabilities: [],
  optional_capabilities: [],
  zpd_targets: [],
  stimulation_level: 'low',
  required_resources: [],
  space_requirement: 'anywhere',
  min_duration_minutes: 5,
  max_duration_minutes: 30,
  is_bedtime_safe: true,
  is_sick_day_safe: true,
  companion_type: 'talk',
  is_fallback: true,
  is_active: true,
}

const babyRow: ActivityRow = {
  ...fallbackRow,
  id: '45ea0e10-b7d0-46cf-ae01-95d6ced0b781',
  title: '躺著踢踢腿',
  opening_line: '我們來動動小腳吧！',
  steps: ['把寶寶放在安全平面上', '輕輕握住腳踝'],
  optional_capabilities: ['canRoll'],
  zpd_targets: ['canRoll'],
  min_age_months: 0,
  max_age_months: 6,
  companion_type: null,
  is_fallback: false,
}

describe('mapRowToActivity', () => {
  it('將 snake_case 列正確對應為 camelCase Activity', () => {
    const activity = mapRowToActivity(babyRow)
    expect(activity).toMatchObject({
      id: '45ea0e10-b7d0-46cf-ae01-95d6ced0b781',
      title: '躺著踢踢腿',
      openingLine: '我們來動動小腳吧！',
      minAgeMonths: 0,
      maxAgeMonths: 6,
      optionalCapabilities: ['canRoll'],
      zpdTargets: ['canRoll'],
      stimulationLevel: 'low',
      spaceRequirement: 'anywhere',
      isFallback: false,
      isActive: true,
    })
    expect(activity.steps).toHaveLength(2)
  })

  it('null 欄位轉成安全預設值', () => {
    const activity = mapRowToActivity(fallbackRow)
    expect(activity.minAgeMonths).toBeUndefined()
    expect(activity.maxAgeMonths).toBeUndefined()
    expect(activity.companionType).toBe('talk')
    expect(activity.isFallback).toBe(true)
  })

  it('非法 stimulation_level 退回 low', () => {
    const activity = mapRowToActivity({ ...babyRow, stimulation_level: 'extreme' })
    expect(activity.stimulationLevel).toBe('low')
  })

  it('steps 不是陣列時回傳空陣列而非崩潰', () => {
    const activity = mapRowToActivity({ ...babyRow, steps: null })
    expect(activity.steps).toEqual([])
  })

  it('對應後的活動可直接被推薦引擎接受（必填欄位齊全）', () => {
    const activity = mapRowToActivity(babyRow)
    expect(activity.requiredCapabilities).toBeInstanceOf(Array)
    expect(activity.requiredResources).toBeInstanceOf(Array)
    expect(typeof activity.minDurationMinutes).toBe('number')
    expect(typeof activity.maxDurationMinutes).toBe('number')
  })
})
