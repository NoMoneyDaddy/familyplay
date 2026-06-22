import { describe, expect, it } from 'vitest'
import {
  clampHour,
  DEFAULT_REMINDER_HOUR,
  formatHour,
  pickReminderBody,
} from '../lib/reminder-pure'

describe('clampHour', () => {
  it('合法小時原樣回傳', () => {
    expect(clampHour(0)).toBe(0)
    expect(clampHour(20)).toBe(20)
    expect(clampHour(23)).toBe(23)
  })
  it('非法輸入回預設', () => {
    expect(clampHour(-1)).toBe(DEFAULT_REMINDER_HOUR)
    expect(clampHour(24)).toBe(DEFAULT_REMINDER_HOUR)
    expect(clampHour(Number.NaN)).toBe(DEFAULT_REMINDER_HOUR)
    expect(clampHour('x')).toBe(DEFAULT_REMINDER_HOUR)
    expect(clampHour(undefined)).toBe(DEFAULT_REMINDER_HOUR)
  })
  it('小數無條件捨去', () => {
    expect(clampHour(8.9)).toBe(8)
  })
})

describe('formatHour', () => {
  it('補零、24 小時制', () => {
    expect(formatHour(8)).toBe('08:00')
    expect(formatHour(20)).toBe('20:00')
  })
})

describe('pickReminderBody', () => {
  const bodies = ['a', 'b', 'c']
  it('依日期序輪流、可回繞', () => {
    expect(pickReminderBody(0, bodies)).toBe('a')
    expect(pickReminderBody(2, bodies)).toBe('c')
    expect(pickReminderBody(3, bodies)).toBe('a')
  })
  it('負數也安全', () => {
    expect(pickReminderBody(-1, bodies)).toBe('c')
  })
  it('空清單回空字串', () => {
    expect(pickReminderBody(0, [])).toBe('')
  })
})
