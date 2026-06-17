import { describe, expect, it } from 'vitest'
import {
  MILESTONES,
  MILESTONE_MAP,
  getBaselineCapabilities,
  getZpdTargets,
  parseTypicalUpperMonth,
} from './domains'

describe('MILESTONES 資料完整性', () => {
  it('每個里程碑都有唯一 key', () => {
    const keys = MILESTONES.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('nextMilestone 都指向存在的里程碑', () => {
    for (const m of MILESTONES) {
      if (m.nextMilestone) {
        expect(MILESTONE_MAP.has(m.nextMilestone)).toBe(true)
      }
    }
  })
})

describe('getZpdTargets', () => {
  it('回傳已達能力的下一個發展目標', () => {
    const zpd = getZpdTargets(['canRoll'])
    expect(zpd).toContain('canSitUnsupported')
  })

  it('排除已經達成的下一目標', () => {
    const zpd = getZpdTargets(['canRoll', 'canSitUnsupported'])
    expect(zpd).not.toContain('canSitUnsupported')
    expect(zpd).toContain('canCrawl')
  })

  it('沒有已達能力時回傳空陣列', () => {
    expect(getZpdTargets([])).toEqual([])
  })

  it('終點里程碑（無 nextMilestone）不產生目標', () => {
    expect(getZpdTargets(['canHopOneFoot'])).toEqual([])
  })

  it('結果去除重複', () => {
    const zpd = getZpdTargets(['canRoll', 'canRoll'])
    expect(zpd).toEqual([...new Set(zpd)])
  })
})

describe('parseTypicalUpperMonth', () => {
  it('取出範圍的上界', () => {
    expect(parseTypicalUpperMonth('6–8 個月')).toBe(8)
    expect(parseTypicalUpperMonth('48–60 個月')).toBe(60)
  })

  it('沒有數字時回傳 null', () => {
    expect(parseTypicalUpperMonth('未知')).toBeNull()
  })
})

describe('getBaselineCapabilities', () => {
  it('新生兒沒有任何已達能力', () => {
    expect(getBaselineCapabilities(0)).toEqual([])
  })

  it('30 個月幼兒已具備早期里程碑但尚未到完整句子', () => {
    const caps = getBaselineCapabilities(30)
    expect(caps).toContain('canSitUnsupported')
    expect(caps).toContain('usesTwoWordPhrases')
    expect(caps).not.toContain('usesSentences') // 典型 30–36，上界 36 > 30
  })

  it('年齡越大涵蓋的能力越多', () => {
    expect(getBaselineCapabilities(60).length).toBeGreaterThan(getBaselineCapabilities(12).length)
  })
})
