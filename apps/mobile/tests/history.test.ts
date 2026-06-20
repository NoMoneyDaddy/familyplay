import { describe, expect, it } from 'vitest'
import { type LogRow, mapLogRow } from '../lib/history'

const base: LogRow = {
  id: 'l1',
  outcome: 'completed',
  child_reaction: 'happy',
  duration_secs: 300,
  created_at: '2026-06-20T00:00:00Z',
  companion_activities: { title: '堆積木' },
}

describe('mapLogRow', () => {
  it('maps a row with a single related activity (object form)', () => {
    expect(mapLogRow(base)).toEqual({
      id: 'l1',
      title: '堆積木',
      outcome: 'completed',
      reaction: 'happy',
      durationSecs: 300,
      createdAt: '2026-06-20T00:00:00Z',
    })
  })

  it('handles the array form of the join', () => {
    expect(mapLogRow({ ...base, companion_activities: [{ title: '唱歌' }] }).title).toBe('唱歌')
  })

  it('falls back to 自由陪伴 when activity is missing', () => {
    expect(mapLogRow({ ...base, companion_activities: null }).title).toBe('自由陪伴')
    expect(mapLogRow({ ...base, companion_activities: [] }).title).toBe('自由陪伴')
  })
})
