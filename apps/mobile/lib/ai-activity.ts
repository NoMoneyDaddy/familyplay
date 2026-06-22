import {
  type AIInput,
  buildActivityPrompt,
  generateSafe,
  getProvider,
  parseGeneratedActivity,
} from '@familyplay/ai'
import { CAPABILITY_LABELS, getZpdTargets } from '@familyplay/assessment'
import {
  type CapabilityKey,
  getAgeMonths,
  getAgeMonthsFromDate,
  getStageKey,
} from '@familyplay/core'
import { type ChildSummary, fetchAchievedCapabilities } from '@familyplay/data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MobileAIProvider, StoredAIKey } from './ai-key'

// 各 provider 的「預設模型」由 build 時的 EXPO_PUBLIC 環境變數帶入——不在 repo 寫死模型版本識別碼。
// 使用者也可在設定填自己的模型名稱（優先）。兩者皆無 → 無法生成（UI 會提示）。
const ENV_MODEL: Record<MobileAIProvider, string | undefined> = {
  gemini: process.env.EXPO_PUBLIC_AI_GEMINI_MODEL,
  groq: process.env.EXPO_PUBLIC_AI_GROQ_MODEL,
  openai: process.env.EXPO_PUBLIC_AI_OPENAI_MODEL,
}

/** 解析要用的模型：使用者填的優先，否則用 build 設定的預設；都沒有回空字串。 */
export function resolveAiModel(
  provider: MobileAIProvider,
  override?: string,
  env: Partial<Record<MobileAIProvider, string | undefined>> = ENV_MODEL,
): string {
  const o = override?.trim()
  if (o) return o
  return env[provider]?.trim() || ''
}

export interface AiActivity {
  title: string
  openingLine: string
  steps: string[]
  followUpQuestions: string[]
  endingLine: string
}

export type AiActivityResult =
  | { ok: true; activity: AiActivity; targetedSkills: string[] }
  | { ok: false; reason: 'no_model' | 'failed' }

/**
 * 手機端 AI 客製活動：用使用者自帶金鑰，依「目前選定孩子」的階段＋發展中能力（ZPD）生一個新活動。
 * 全程不送孩子暱稱或原始生日字串——只送去識別化的月齡＋階段＋發展中能力（對齊 CLAUDE.md AI 安全 #5）。
 * Safety Filter 由 generateSafe 在輸出後執行；任何失敗回 ok:false，呼叫端安靜降回。
 */
export async function generateAiActivity(
  supabase: SupabaseClient,
  child: ChildSummary,
  key: StoredAIKey,
): Promise<AiActivityResult> {
  const model = resolveAiModel(key.provider, key.model)
  if (!model) return { ok: false, reason: 'no_model' }

  try {
    // 月齡：有精確生日用精確生日，否則用年月；都異常則放棄（避免送不合理年齡給 AI）。
    let ageMonths: number | null = null
    if (child.birthDate) {
      try {
        const m = getAgeMonthsFromDate(child.birthDate)
        if (m >= 0) ageMonths = m
      } catch {}
    }
    if (ageMonths == null && child.birthYearMonth) {
      try {
        const m = getAgeMonths(child.birthYearMonth)
        if (m >= 0) ageMonths = m
      } catch {}
    }
    if (ageMonths == null) return { ok: false, reason: 'failed' }

    const stageKey = getStageKey(ageMonths)
    const achieved = await fetchAchievedCapabilities(supabase, child.id)
    const acquired = Object.keys(achieved) as CapabilityKey[]
    const developing = getZpdTargets(acquired)

    const aiInput: AIInput = {
      stageKey,
      capabilityKeys: developing,
      parentEnergy: 'low',
      spaceContext: 'anywhere',
      companionType: 'play',
      availableResources: [],
      ageMonths,
    }

    const provider = getProvider(key.provider, { apiKey: key.apiKey, model })
    if (!provider) return { ok: false, reason: 'failed' }

    const result = await generateSafe(provider, aiInput, buildActivityPrompt)
    if (!result.ok) return { ok: false, reason: 'failed' }

    const activity = parseGeneratedActivity(result.content)
    if (!activity) return { ok: false, reason: 'failed' }

    const targetedSkills = Array.from(
      new Set(developing.map((k) => CAPABILITY_LABELS[k]).filter(Boolean)),
    )
    return { ok: true, activity, targetedSkills }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
