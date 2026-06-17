import { ALLOWED_RESOURCE_KEYS, ALLOWED_SPACE_CONTEXTS } from '@familyplay/ai'
import { ALLOWED_STAGE_KEYS, getStageKey } from '@familyplay/core'
import { describe, expect, it } from 'vitest'
import { AGE_OPTIONS, RESOURCE_OPTIONS, SPACE_OPTIONS } from './options'

describe('UI 選項與後端白名單一致', () => {
  it('資源選項全部落在白名單內', () => {
    for (const option of RESOURCE_OPTIONS) {
      expect(ALLOWED_RESOURCE_KEYS).toContain(option.value)
    }
  })

  it('場景選項全部落在白名單內', () => {
    for (const option of SPACE_OPTIONS) {
      expect(ALLOWED_SPACE_CONTEXTS).toContain(option.value)
    }
  })

  it('每個年齡選項都能對應到合法 stageKey', () => {
    for (const option of AGE_OPTIONS) {
      expect(ALLOWED_STAGE_KEYS).toContain(getStageKey(option.value))
    }
  })
})
