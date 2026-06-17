import { BLOCKED_MATERIALS_UNDER_3 } from '@familyplay/core'

// Single source of truth for under-3 choking hazards comes from core, so the AI
// safety filter and the rule-based engine can never diverge.
const blockedMaterialsPattern = new RegExp(BLOCKED_MATERIALS_UNDER_3.join('|'))

const BLOCKED_PATTERNS: RegExp[] = [
  blockedMaterialsPattern,
  /窒息|割傷|燙傷|觸電|溺水/,
  /醫療|診斷|治療|症狀|疾病|療程|處方/,
  /發展遲緩|遲緩|落後|異常|障礙/,
  // Prompt-injection markers (EN + ZH variants)
  /system:|assistant:|<\|im_start\|>|<\|im_end\|>|\[INST\]|###\s*system|ignore (previous|above)|忽略(以上|上述|前面)/i,
  // URLs, including scheme-relative //host and bare www.
  /https?:\/\/|\/\/[\w.-]+|www\.[\w.-]+/i,
]

const MAX_OUTPUT_LENGTH = 2000

// Strip zero-width characters and collapse whitespace so simple obfuscation
// can't slip past the pattern checks.
function normalize(output: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally stripping zero-width chars
  return output.replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim()
}

export function safetyFilter(output: string): boolean {
  return checkSafety(output).passed
}

export type SafetyCheckResult =
  | { passed: true }
  | { passed: false; reason: 'blocked_pattern' | 'too_long' }

export function checkSafety(output: string): SafetyCheckResult {
  if (output.length > MAX_OUTPUT_LENGTH) {
    return { passed: false, reason: 'too_long' }
  }

  const normalized = normalize(output)
  const blocked = BLOCKED_PATTERNS.find((pattern) => pattern.test(normalized))
  if (blocked) {
    return { passed: false, reason: 'blocked_pattern' }
  }

  return { passed: true }
}
