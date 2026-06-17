import { beforeEach, describe, expect, it } from 'vitest'
import { useCompanionStore } from './companion-store'

beforeEach(() => {
  useCompanionStore.getState().reset()
})

describe('useCompanionStore', () => {
  it('預設狀態尚未填妥，不可送出', () => {
    const state = useCompanionStore.getState()
    expect(state.isReady()).toBe(false)
    expect(state.toRequestBody()).toBeNull()
  })

  it('填好年齡、狀態、時間後可送出，並帶入預設情境', () => {
    const state = useCompanionStore.getState()
    state.setAgeMonths(30)
    state.setParentEnergy('low')
    state.setAvailableMinutes(10)

    expect(useCompanionStore.getState().isReady()).toBe(true)
    expect(useCompanionStore.getState().toRequestBody()).toEqual({
      ageMonths: 30,
      parentEnergy: 'low',
      companionContext: 'normal',
      space: 'anywhere',
      availableMinutes: 10,
      availableResources: [],
    })
  })

  it('toggleResource 可加入與移除', () => {
    const state = useCompanionStore.getState()
    state.toggleResource('books')
    expect(useCompanionStore.getState().availableResources).toEqual(['books'])
    useCompanionStore.getState().toggleResource('books')
    expect(useCompanionStore.getState().availableResources).toEqual([])
  })

  it('reset 還原所有選擇', () => {
    const state = useCompanionStore.getState()
    state.setAgeMonths(15)
    state.setSpace('park')
    state.toggleResource('balls')

    useCompanionStore.getState().reset()
    const after = useCompanionStore.getState()
    expect(after.ageMonths).toBeNull()
    expect(after.space).toBe('anywhere')
    expect(after.availableResources).toEqual([])
  })
})
