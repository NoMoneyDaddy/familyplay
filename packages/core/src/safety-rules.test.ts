import { describe, expect, it } from 'vitest'
import { containsBlockedMaterial, hasBlockedContextKeyword, isUnder3 } from './safety-rules'

describe('isUnder3', () => {
  it('marks crawler as under 3', () => {
    expect(isUnder3('crawler')).toBe(true)
  })

  it('marks 18–36 月學步幼兒 as under 3（窒息高風險，對齊 0–3 歲規格）', () => {
    expect(isUnder3('toddler_talker')).toBe(true)
    expect(isUnder3('toddler_player')).toBe(true)
  })

  it('marks preschooler as NOT under 3', () => {
    expect(isUnder3('preschooler')).toBe(false)
  })
})

describe('containsBlockedMaterial', () => {
  it('blocks coin mention for under-3 stage', () => {
    expect(containsBlockedMaterial('用硬幣排排看', 'crawler')).toBe(true)
  })

  it('blocks 小零件 for 2 歲（toddler_player）—— 先前漏擋的窒息風險', () => {
    expect(containsBlockedMaterial('用鈕扣玩分類', 'toddler_player')).toBe(true)
  })

  it('allows coin mention for preschooler', () => {
    expect(containsBlockedMaterial('用硬幣排排看', 'preschooler')).toBe(false)
  })

  it('blocks battery for early_infant', () => {
    expect(containsBlockedMaterial('電池當道具', 'early_infant')).toBe(true)
  })
})

describe('hasBlockedContextKeyword', () => {
  it('blocks high-stimulation in bedtime context', () => {
    expect(hasBlockedContextKeyword('高刺激跑跳遊戲', 'bedtime')).toBe(true)
  })

  it('blocks competition in emotional_crisis', () => {
    expect(hasBlockedContextKeyword('看誰贏', 'emotional_crisis')).toBe(true)
  })

  it('allows normal context', () => {
    expect(hasBlockedContextKeyword('跑跳遊戲', 'normal')).toBe(false)
  })
})
