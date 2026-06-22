import { describe, expect, it } from 'vitest'
import { type CachedRec, parseCachedRec } from '../lib/rec-cache-pure'

const valid: CachedRec = {
  id: 'abc',
  title: '追泡泡',
  developmentalFocus: ['gross_motor'],
  minDurationMinutes: 5,
  maxDurationMinutes: 10,
  stimulationLevel: 'medium',
  reasons: ['正好練到他正在發展的能力'],
}

describe('parseCachedRec', () => {
  it('null/空字串 → null', () => {
    expect(parseCachedRec(null)).toBeNull()
    expect(parseCachedRec('')).toBeNull()
  })

  it('壞 JSON → null', () => {
    expect(parseCachedRec('{not json')).toBeNull()
  })

  it('缺必要欄位（id/title/陣列）→ null（避免渲染白屏）', () => {
    expect(
      parseCachedRec(JSON.stringify({ title: 'x', reasons: [], developmentalFocus: [] })),
    ).toBeNull()
    expect(
      parseCachedRec(JSON.stringify({ id: 'x', reasons: [], developmentalFocus: [] })),
    ).toBeNull()
    expect(
      parseCachedRec(
        JSON.stringify({ id: 'x', title: 'y', reasons: 'no', developmentalFocus: [] }),
      ),
    ).toBeNull()
  })

  it('完整快取 → 還原', () => {
    expect(parseCachedRec(JSON.stringify(valid))).toEqual(valid)
  })

  it('時長缺值 → 補 null，過濾非字串', () => {
    const parsed = parseCachedRec(
      JSON.stringify({ id: 'a', title: 'b', developmentalFocus: ['x', 1], reasons: ['ok', null] }),
    )
    expect(parsed?.minDurationMinutes).toBeNull()
    expect(parsed?.developmentalFocus).toEqual(['x'])
    expect(parsed?.reasons).toEqual(['ok'])
  })
})
