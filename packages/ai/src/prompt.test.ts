import { describe, expect, it } from 'vitest'
import { buildActivityPrompt } from './prompt'
import type { AIInput } from './types'

const base: AIInput = {
  stageKey: 'newborn',
  capabilityKeys: ['canRoll'],
  parentEnergy: 'low',
  spaceContext: 'living_room',
  companionType: 'play',
  availableResources: ['none'],
}

describe('buildActivityPrompt', () => {
  it('輸出 system/user/maxTokens', () => {
    const p = buildActivityPrompt(base)
    expect(p.system).toContain('繁體中文')
    expect(p.user).toContain('客廳')
    expect(p.maxTokens).toBeGreaterThan(0)
  })

  it('0–3 歲加上窒息風險警語', () => {
    const p = buildActivityPrompt(base)
    expect(p.system).toContain('窒息')
  })

  it('較大孩子不套用幼兒窒息警語', () => {
    const p = buildActivityPrompt({ ...base, stageKey: 'preschooler' })
    expect(p.system).not.toContain('嚴禁任何小零件')
  })

  it('要求只輸出 JSON 且禁止連結與醫療', () => {
    const p = buildActivityPrompt(base)
    expect(p.system).toContain('只輸出 JSON')
    expect(p.system).toContain('連結')
    expect(p.system).toContain('醫療')
  })

  it('不含任何個資欄位（暱稱/生日）', () => {
    const p = buildActivityPrompt(base)
    const blob = `${p.system}\n${p.user}`
    expect(blob).not.toMatch(/暱稱|生日|姓名/)
  })
})
