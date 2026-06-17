// 推薦 API 的純邏輯：輸入白名單驗證 + 呼叫推薦引擎。
// 與 Next.js Route Handler 分離，方便單元測試。

import { ALLOWED_RESOURCE_KEYS, ALLOWED_SPACE_CONTEXTS } from '@familyplay/ai'
import {
  ALLOWED_CAPABILITY_KEYS,
  ALLOWED_STAGE_KEYS,
  type RecommendationContext,
  type RecommendationResult,
  STARTER_ACTIVITIES,
  getStageKey,
  recommend,
} from '@familyplay/core'
import { z } from 'zod'

// CLAUDE.md 規則：所有輸入都必須通過白名單驗證
export const recommendInputSchema = z.object({
  ageMonths: z.number().int().min(0).max(72),
  stageKey: z.enum(ALLOWED_STAGE_KEYS as [string, ...string[]]).optional(),
  achievedCapabilities: z
    .array(z.enum(ALLOWED_CAPABILITY_KEYS as [string, ...string[]]))
    .default([]),
  zpdTargets: z.array(z.enum(ALLOWED_CAPABILITY_KEYS as [string, ...string[]])).default([]),
  parentEnergy: z.enum(['low', 'medium', 'high']),
  companionContext: z.enum(['bedtime', 'emotional_crisis', 'sick_day', 'normal']).default('normal'),
  space: z.enum(ALLOWED_SPACE_CONTEXTS as [string, ...string[]]).default('anywhere'),
  availableResources: z.array(z.enum(ALLOWED_RESOURCE_KEYS as [string, ...string[]])).default([]),
  availableMinutes: z.number().int().min(1).max(240),
  recentActivityIds: z.array(z.string().max(64)).max(100).default([]),
})

export type RecommendInput = z.infer<typeof recommendInputSchema>

export function buildContext(input: RecommendInput): RecommendationContext {
  return {
    ageMonths: input.ageMonths,
    // stageKey 由年齡推算，不信任客戶端傳入（避免繞過年齡安全規則）
    stageKey: getStageKey(input.ageMonths),
    achievedCapabilities:
      input.achievedCapabilities as RecommendationContext['achievedCapabilities'],
    zpdTargets: input.zpdTargets as RecommendationContext['zpdTargets'],
    parentEnergy: input.parentEnergy,
    companionContext: input.companionContext,
    space: input.space,
    availableResources: input.availableResources,
    availableMinutes: input.availableMinutes,
    recentActivityIds: input.recentActivityIds,
  }
}

export type RecommendOutcome =
  | { ok: true; result: RecommendationResult }
  | { ok: false; status: number; error: string; issues?: unknown }

/**
 * 解析未知輸入並產生推薦。活動目前來自內建活動庫；
 * 正式環境應改由 Supabase companion_activities 載入後傳入 activities。
 */
export function getRecommendations(
  rawInput: unknown,
  activities = STARTER_ACTIVITIES,
): RecommendOutcome {
  const parsed = recommendInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: '輸入格式不正確',
      issues: parsed.error.flatten(),
    }
  }
  const ctx = buildContext(parsed.data)
  return { ok: true, result: recommend(activities, ctx) }
}
