import { BLOCKED_MATERIALS_PATTERN } from '@familyplay/core'

const BLOCKED_PATTERNS: readonly RegExp[] = [
  BLOCKED_MATERIALS_PATTERN,
  /窒息|割傷|燙傷|觸電|溺水/,
  /醫療|診斷|治療|症狀|疾病|療程|處方/,
  /發展遲緩|遲緩|落後|異常|障礙/,
  /system:|assistant:|<\|im_start\|>|<\|im_end\|>/i,
  /https?:\/\//,
] as const

const MAX_OUTPUT_LENGTH = 2000

export function safetyFilter(output: string): boolean {
  if (output.length > MAX_OUTPUT_LENGTH) return false
  return BLOCKED_PATTERNS.every((pattern) => !pattern.test(output))
}

export type SafetyCheckResult =
  | { passed: true }
  | { passed: false; reason: 'blocked_pattern' | 'too_long' }

export function checkSafety(output: string): SafetyCheckResult {
  if (output.length > MAX_OUTPUT_LENGTH) {
    return { passed: false, reason: 'too_long' }
  }

  const blocked = BLOCKED_PATTERNS.find((pattern) => pattern.test(output))
  if (blocked) {
    return { passed: false, reason: 'blocked_pattern' }
  }

  return { passed: true }
}
