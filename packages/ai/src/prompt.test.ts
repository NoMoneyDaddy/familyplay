import { describe, expect, it } from 'vitest'
import {
  buildActivityPrompt,
  buildHandoffPrompt,
  parseGeneratedActivity,
  sanitizeHandoffSummary,
} from './prompt'
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
    const p = buildActivityPrompt({ ...base, ageMonths: 18 })
    const blob = `${p.system}\n${p.user}`
    // 即使帶了去識別化年齡，也不得出現暱稱/生日/姓名等個資字樣
    expect(blob).not.toMatch(/暱稱|生日|姓名/)
  })

  it('帶 ageMonths 時放入去識別化的精確年齡', () => {
    expect(buildActivityPrompt({ ...base, ageMonths: 18 }).user).toContain('1 歲 6 個月')
    expect(buildActivityPrompt({ ...base, ageMonths: 5 }).user).toContain('5 個月大')
  })

  it('未帶 ageMonths 時不加年齡描述', () => {
    expect(buildActivityPrompt(base).user).not.toMatch(/個月大|歲/)
  })
})

describe('buildHandoffPrompt', () => {
  it('輸出 system/user/maxTokens 且為純文字短評（非 JSON）', () => {
    const p = buildHandoffPrompt(base)
    expect(p.system).toContain('繁體中文')
    expect(p.system).toContain('交接小卡')
    expect(p.system).not.toContain('JSON')
    expect(p.maxTokens).toBeGreaterThan(0)
  })

  it('禁止醫療診斷與外部連結', () => {
    const p = buildHandoffPrompt(base)
    expect(p.system).toContain('醫療')
    expect(p.system).toContain('連結')
  })

  it('帶入發展中能力；無能力時給通用語', () => {
    expect(buildHandoffPrompt(base).user).toContain('canRoll')
    expect(buildHandoffPrompt({ ...base, capabilityKeys: [] }).user).toContain('沒有特別標記')
  })

  it('不含任何個資欄位（暱稱/生日/姓名）', () => {
    const p = buildHandoffPrompt(base)
    expect(`${p.system}\n${p.user}`).not.toMatch(/暱稱|生日|姓名/)
  })
})

describe('sanitizeHandoffSummary', () => {
  it('去 markdown 圍欄、壓成單段', () => {
    expect(sanitizeHandoffSummary('```\n寶寶最近\n很愛探索\n```')).toBe('寶寶最近 很愛探索')
  })

  it('全空白回 null', () => {
    expect(sanitizeHandoffSummary('   \n  ')).toBeNull()
  })

  it('過長截斷在句號處', () => {
    const long = `${'啊'.repeat(120)}。${'喔'.repeat(120)}`
    const out = sanitizeHandoffSummary(long)
    expect(out).not.toBeNull()
    expect((out as string).length).toBeLessThanOrEqual(200)
    expect((out as string).endsWith('。')).toBe(true)
  })

  it('短文原樣保留', () => {
    expect(sanitizeHandoffSummary('現在很愛抓握，多陪他玩抓抓遊戲。')).toBe(
      '現在很愛抓握，多陪他玩抓抓遊戲。',
    )
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
