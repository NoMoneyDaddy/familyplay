import { ALLOWED_CAPABILITY_KEYS, type CapabilityKey } from './capability-keys'
import {
  ALLOWED_COMPANION_TYPES,
  ALLOWED_PARENT_ENERGY_LEVELS,
  ALLOWED_RESOURCE_KEYS,
  ALLOWED_SPACE_CONTEXTS,
  type CompanionType,
  type ParentEnergy,
  type ResourceKey,
  type SpaceContext,
} from './domain-types'
import { ALLOWED_STAGE_KEYS, type StageKey } from './stage-keys'

export function isAllowedValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

export function isValidStageKey(value: unknown): value is StageKey {
  return isAllowedValue(value, ALLOWED_STAGE_KEYS)
}

export function isValidCapabilityKey(value: unknown): value is CapabilityKey {
  return isAllowedValue(value, ALLOWED_CAPABILITY_KEYS)
}

export function isValidParentEnergy(value: unknown): value is ParentEnergy {
  return isAllowedValue(value, ALLOWED_PARENT_ENERGY_LEVELS)
}

export function isValidSpaceContext(value: unknown): value is SpaceContext {
  return isAllowedValue(value, ALLOWED_SPACE_CONTEXTS)
}

export function isValidCompanionType(value: unknown): value is CompanionType {
  return isAllowedValue(value, ALLOWED_COMPANION_TYPES)
}

export function isValidResourceKey(value: unknown): value is ResourceKey {
  return isAllowedValue(value, ALLOWED_RESOURCE_KEYS)
}
