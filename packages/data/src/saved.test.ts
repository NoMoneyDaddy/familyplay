import { describe, expect, it } from 'vitest'
import { mapSavedRow, type SavedRow } from './saved'

describe('mapSavedRow', () => {
  it('maps a row with the join as an object', () => {
    const row: SavedRow = {
      activity_id: 'a1',
      created_at: '2026-06-20T00:00:00Z',
      companion_activities: {
        id: 'a1',
        title: '堆積木',
        min_duration_minutes: 5,
        max_duration_minutes: 15,
        stimulation_level: 'medium',
        developmental_focus: ['fine_motor'],
      },
    }
    expect(mapSavedRow(row)).toEqual({
      activityId: 'a1',
      title: '堆積木',
      minDurationMinutes: 5,
      maxDurationMinutes: 15,
      stimulationLevel: 'medium',
      developmentalFocus: ['fine_motor'],
      createdAt: '2026-06-20T00:00:00Z',
    })
  })

  it('handles the join returned as an array', () => {
    const row: SavedRow = {
      activity_id: 'a2',
      created_at: null,
      companion_activities: [{ title: '藏貓貓', developmental_focus: null }],
    }
    const out = mapSavedRow(row)
    expect(out.title).toBe('藏貓貓')
    expect(out.developmentalFocus).toEqual([])
    expect(out.minDurationMinutes).toBeNull()
  })

  it('falls back gracefully when the join is missing', () => {
    const row: SavedRow = { activity_id: 'a3', created_at: null, companion_activities: null }
    const out = mapSavedRow(row)
    expect(out.title).toBe('活動')
    expect(out.developmentalFocus).toEqual([])
  })
})
