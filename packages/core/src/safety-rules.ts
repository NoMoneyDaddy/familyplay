import { ALLOWED_STAGE_KEYS } from './stage-keys'
import type { StageKey } from './stage-keys'

export const BLOCKED_MATERIALS_UNDER_3 = [
  '硬幣',
  '鈕扣',
  '電池',
  '磁鐵',
  '彈珠',
  '小零件',
  '氣球',
  '塑膠袋',
  '繩子',
  '珠子',
  '別針',
  '迴紋針',
]

export const BLOCKED_CONTEXTS = {
  bedtime: ['高刺激', '競賽', '跑跳', '興奮', '爭輸贏'],
  emotional_crisis: ['競賽', '規則', '評分', '輸贏', '難度'],
  sick_day: ['跑跳', '戶外', '流汗', '高刺激', '複雜規則'],
} as const

export const HIGH_RISK_STAGES: StageKey[] = [
  'newborn',
  'early_infant',
  'sitting_baby',
  'crawler',
  'early_walker',
]

export function isUnder3(stageKey: StageKey): boolean {
  return HIGH_RISK_STAGES.includes(stageKey)
}

export function containsBlockedMaterial(text: string, stageKey: StageKey): boolean {
  if (!ALLOWED_STAGE_KEYS.includes(stageKey)) {
    throw new Error(`Invalid stageKey: "${stageKey}"`)
  }
  if (!isUnder3(stageKey)) return false
  return BLOCKED_MATERIALS_UNDER_3.some((material) => text.includes(material))
}

export type CompanionContext = 'bedtime' | 'emotional_crisis' | 'sick_day' | 'normal'

const VALID_CONTEXTS = new Set<CompanionContext>([
  'bedtime',
  'emotional_crisis',
  'sick_day',
  'normal',
])

export function hasBlockedContextKeyword(text: string, context: CompanionContext): boolean {
  if (!VALID_CONTEXTS.has(context)) {
    throw new Error(`Unknown CompanionContext: "${context}"`)
  }
  if (context === 'normal') return false
  const keywords = BLOCKED_CONTEXTS[context]
  return keywords.some((keyword) => text.includes(keyword))
}

export const SAFETY_REQUIRED_ACTIVITIES = ['outdoor', 'physical', 'craft'] as const

export const FALLBACK_ACTIVITY = {
  id: 'fallback-ask-about-day',
  title: '問你一件今天的事',
  openingLine: '你今天有什麼讓你開心的事嗎？',
  steps: ['坐在孩子旁邊', '說出開口第一句', '認真聽孩子的回答'],
  requiredCapabilities: [] as string[],
  stimulationLevel: 'low' as const,
  isFallback: true,
}
