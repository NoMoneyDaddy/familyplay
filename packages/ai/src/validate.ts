import { ALLOWED_CAPABILITY_KEYS, ALLOWED_STAGE_KEYS } from '@familyplay/core'
import {
  type AIInput,
  ALLOWED_COMPANION_TYPES,
  ALLOWED_RESOURCE_KEYS,
  ALLOWED_SPACE_CONTEXTS,
} from './types'

const ALLOWED_PARENT_ENERGY = ['low', 'medium', 'high'] as const

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Whitelist-validate every field of an AIInput before it can be used to build
 * an AI request (CLAUDE.md AI safety rule #1). Rejects any value not present in
 * the corresponding allow-list. Never trusts caller-supplied strings.
 *
 * Note: AIInput may carry a DE-IDENTIFIED precise age (ageMonths) derived from
 * the child's birthday, but never the child's nickname or the raw birthdate
 * string (rule #5). ageMonths, when present, is bounded-validated here.
 */
export function validateAIInput(input: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['input must be an object'] }
  }

  const i = input as Partial<AIInput>

  if (!i.stageKey || !ALLOWED_STAGE_KEYS.includes(i.stageKey)) {
    errors.push(`invalid stageKey: ${String(i.stageKey)}`)
  }

  if (!Array.isArray(i.capabilityKeys)) {
    errors.push('capabilityKeys must be an array')
  } else {
    for (const key of i.capabilityKeys) {
      if (!ALLOWED_CAPABILITY_KEYS.includes(key)) {
        errors.push(`invalid capabilityKey: ${String(key)}`)
      }
    }
  }

  if (!i.parentEnergy || !ALLOWED_PARENT_ENERGY.includes(i.parentEnergy)) {
    errors.push(`invalid parentEnergy: ${String(i.parentEnergy)}`)
  }

  if (!i.spaceContext || !ALLOWED_SPACE_CONTEXTS.includes(i.spaceContext)) {
    errors.push(`invalid spaceContext: ${String(i.spaceContext)}`)
  }

  if (!i.companionType || !ALLOWED_COMPANION_TYPES.includes(i.companionType)) {
    errors.push(`invalid companionType: ${String(i.companionType)}`)
  }

  if (!Array.isArray(i.availableResources)) {
    errors.push('availableResources must be an array')
  } else {
    for (const r of i.availableResources) {
      if (!ALLOWED_RESOURCE_KEYS.includes(r)) {
        errors.push(`invalid resource: ${String(r)}`)
      }
    }
  }

  // ageMonths 選填；給了就必須是 0–144（0–12 歲）區間內的整數，擋掉異常/注入值。
  if (i.ageMonths !== undefined) {
    if (!Number.isInteger(i.ageMonths) || i.ageMonths < 0 || i.ageMonths > 144) {
      errors.push(`invalid ageMonths: ${String(i.ageMonths)}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
