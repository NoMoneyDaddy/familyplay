import { ALLOWED_CAPABILITY_KEYS } from '@familyplay/core'
import { describe, expect, it } from 'vitest'
import { pickAchieved } from '../lib/capabilities'

const KNOWN = ALLOWED_CAPABILITY_KEYS[0] // 一定在白名單內

describe('pickAchieved', () => {
  it('keeps only whitelisted keys whose value is strictly true', () => {
    const out = pickAchieved({ [KNOWN]: true })
    expect(out).toEqual({ [KNOWN]: true })
  })

  it('drops false / non-true values', () => {
    const out = pickAchieved({ [KNOWN]: false })
    expect(out).toEqual({})
  })

  it('drops unknown keys even when true (防殘留舊鍵污染)', () => {
    const out = pickAchieved({ __not_a_real_capability__: true })
    expect(out).toEqual({})
  })

  it('handles null/undefined as empty', () => {
    expect(pickAchieved(null)).toEqual({})
    expect(pickAchieved(undefined)).toEqual({})
  })
})
