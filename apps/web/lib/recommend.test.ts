import { describe, expect, it } from 'vitest'
import { buildContext, getRecommendations, recommendInputSchema } from './recommend'

const validInput = {
  ageMonths: 40,
  achievedCapabilities: ['usesSentences'],
  parentEnergy: 'medium',
  companionContext: 'normal',
  space: 'living_room',
  availableResources: ['books'],
  availableMinutes: 30,
}

describe('recommendInputSchema 白名單驗證', () => {
  it('接受合法輸入', () => {
    expect(recommendInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('拒絕非白名單能力 key', () => {
    const bad = { ...validInput, achievedCapabilities: ['canFly'] }
    expect(recommendInputSchema.safeParse(bad).success).toBe(false)
  })

  it('拒絕非白名單情境', () => {
    const bad = { ...validInput, companionContext: 'party' }
    expect(recommendInputSchema.safeParse(bad).success).toBe(false)
  })

  it('拒絕超出範圍的年齡', () => {
    expect(recommendInputSchema.safeParse({ ...validInput, ageMonths: 999 }).success).toBe(false)
  })

  it('套用預設值', () => {
    const parsed = recommendInputSchema.parse({
      ageMonths: 40,
      parentEnergy: 'low',
      availableMinutes: 15,
    })
    expect(parsed.companionContext).toBe('normal')
    expect(parsed.achievedCapabilities).toEqual([])
    expect(parsed.space).toBe('anywhere')
  })
})

describe('buildContext', () => {
  it('stageKey 由年齡推算，不採用客戶端傳入值', () => {
    const ctx = buildContext(
      recommendInputSchema.parse({ ...validInput, ageMonths: 8, stageKey: 'preschooler' }),
    )
    expect(ctx.stageKey).toBe('sitting_baby')
  })
})

describe('getRecommendations', () => {
  it('合法輸入回傳推薦結果', () => {
    const outcome = getRecommendations(validInput)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.result.recommendations.length).toBeGreaterThan(0)
    }
  })

  it('非法輸入回傳 400 與錯誤', () => {
    const outcome = getRecommendations({ ageMonths: 'old' })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.status).toBe(400)
    }
  })

  it('無活動通過時回傳保底方案', () => {
    const outcome = getRecommendations(validInput, [])
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.result.usedFallback).toBe(true)
    }
  })
})
