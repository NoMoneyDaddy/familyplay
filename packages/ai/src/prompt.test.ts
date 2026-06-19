import { describe, expect, it } from 'vitest'
import { buildActivityPrompt, parseGeneratedActivity } from './prompt'
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

describe('parseGeneratedActivity', () => {
  const valid = JSON.stringify({
    title: '抓抓彩色巾',
    openingLine: '看～這條彩色巾',
    steps: ['步驟一', '步驟二'],
    followUpQuestions: ['他喜歡嗎？'],
    endingLine: '玩得真好',
  })

  it('解析合法 JSON', () => {
    const a = parseGeneratedActivity(valid)
    expect(a?.title).toBe('抓抓彩色巾')
    expect(a?.steps).toHaveLength(2)
  })

  it('容忍 markdown 圍欄', () => {
    const a = parseGeneratedActivity(`\`\`\`json\n${valid}\n\`\`\``)
    expect(a?.title).toBe('抓抓彩色巾')
  })

  it('非 JSON 回 null', () => {
    expect(parseGeneratedActivity('抱歉我無法回答')).toBeNull()
  })

  it('缺 title 或 steps 回 null', () => {
    expect(parseGeneratedActivity(JSON.stringify({ title: '', steps: [] }))).toBeNull()
    expect(parseGeneratedActivity(JSON.stringify({ title: '有', steps: [] }))).toBeNull()
  })

  it('過濾非字串 step、限制長度', () => {
    const a = parseGeneratedActivity(
      JSON.stringify({ title: '測試', steps: ['ok', 123, '', 'ok2'] }),
    )
    expect(a?.steps).toEqual(['ok', 'ok2'])
  })
})
