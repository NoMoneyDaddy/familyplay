import { checkSafety } from './safety'
import type { AIInput, AIProvider, AIResponse } from './types'
import { validateAIInput } from './validate'

export type GenerateSafeResult =
  | { ok: true; content: string; provider: AIResponse['provider']; tokensUsed: number }
  | {
      ok: false
      reason: 'invalid_input' | 'safety_blocked' | 'provider_failed'
      details?: string[]
    }

/**
 * The full AI safety pipeline (CLAUDE.md AI safety rules):
 *   1. Whitelist-validate the input            (rule #1)
 *   2. Call the provider                         (key handling lives in provider)
 *   3. Run the Safety Filter on the OUTPUT       (rule #2)
 *   On any failure the caller MUST fall back to the rule-based engine.
 *
 * The prompt builder is injected so this stays provider-agnostic and unit
 * testable with a mock provider. The builder must never include child nickname
 * or birthday (rule #5).
 */
export async function generateSafe(
  provider: AIProvider,
  input: AIInput,
  buildPrompt: (input: AIInput) => { system: string; user: string; maxTokens: number },
): Promise<GenerateSafeResult> {
  const validation = validateAIInput(input)
  if (!validation.valid) {
    return { ok: false, reason: 'invalid_input', details: validation.errors }
  }

  let response: AIResponse
  try {
    response = await provider.generate(buildPrompt(input))
  } catch {
    return { ok: false, reason: 'provider_failed' }
  }

  if (!response.success || !response.content) {
    return { ok: false, reason: 'provider_failed' }
  }

  const safety = checkSafety(response.content)
  if (!safety.passed) {
    return { ok: false, reason: 'safety_blocked', details: [safety.reason] }
  }

  return {
    ok: true,
    content: response.content,
    provider: response.provider,
    tokensUsed: response.tokensUsed,
  }
}
