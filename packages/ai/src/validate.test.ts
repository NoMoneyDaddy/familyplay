import { describe, expect, it } from 'vitest'
import type { AIInput } from './types'
import { validateAIInput } from './validate'

const validInput: AIInput = {
  stageKey: 'toddler_player',
  capabilityKeys: [],
  parentEnergy: 'medium',
  spaceContext: 'living_room',
  companionType: 'play',
  availableResources: ['blocks'],
}

describe('validateAIInput', () => {
  it('accepts a fully valid input', () => {
    expect(validateAIInput(validInput).valid).toBe(true)
  })

  it('rejects an invalid stageKey (whitelist)', () => {
    const r = validateAIInput({ ...validInput, stageKey: 'teenager' as never })
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toContain('stageKey')
  })

  it('rejects an invalid parentEnergy', () => {
    const r = validateAIInput({ ...validInput, parentEnergy: 'exhausted' as never })
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toContain('parentEnergy')
  })

  it('rejects unknown capability keys', () => {
    const r = validateAIInput({ ...validInput, capabilityKeys: ['canFly' as never] })
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toContain('capabilityKey')
  })

  it('rejects unknown resources', () => {
    const r = validateAIInput({ ...validInput, availableResources: ['knife' as never] })
    expect(r.valid).toBe(false)
  })

  it('rejects non-object input', () => {
    expect(validateAIInput(null).valid).toBe(false)
    expect(validateAIInput('nope').valid).toBe(false)
  })
})
