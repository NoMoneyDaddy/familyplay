import { describe, expect, it } from 'vitest'
import { type ActivityDetailRow, mapActivityDetailRow } from './activity'

const base: ActivityDetailRow = {
  id: 'a1',
  title: '堆積木',
  opening_line: '我們來蓋一座高塔！',
  steps: ['拿出積木', '一塊一塊往上疊', '數數看疊了幾塊'],
  follow_up_questions: ['塔會倒嗎？', '還能蓋什麼？'],
  ending_line: '好棒，收積木囉',
  min_duration_minutes: 5,
  max_duration_minutes: 15,
  safety_notes: '注意小零件',
  developmental_focus: ['fine_motor'],
  zpd_targets: ['canStack'],
}

describe('mapActivityDetailRow', () => {
  it('maps all fields', () => {
    const a = mapActivityDetailRow(base)
    expect(a.title).toBe('堆積木')
    expect(a.openingLine).toBe('我們來蓋一座高塔！')
    expect(a.steps).toHaveLength(3)
    expect(a.followUpQuestions).toEqual(['塔會倒嗎？', '還能蓋什麼？'])
    expect(a.endingLine).toBe('好棒，收積木囉')
    expect(a.safetyNotes).toBe('注意小零件')
    expect(a.developmentalFocus).toEqual(['fine_motor'])
    expect(a.zpdTargets).toEqual(['canStack'])
  })

  it('coerces non-string-array jsonb to safe string[]', () => {
    const a = mapActivityDetailRow({
      ...base,
      steps: [1, 'ok', { text: 'x' }, null] as unknown,
      follow_up_questions: null as unknown,
    })
    expect(a.steps).toEqual(['ok'])
    expect(a.followUpQuestions).toEqual([])
  })

  it('defaults nullable arrays to []', () => {
    const a = mapActivityDetailRow({ ...base, developmental_focus: null, zpd_targets: null })
    expect(a.developmentalFocus).toEqual([])
    expect(a.zpdTargets).toEqual([])
  })
})
