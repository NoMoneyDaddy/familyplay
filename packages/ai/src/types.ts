import type { CapabilityKey, StageKey } from '@familyplay/core'

export type AIProviderName = 'gemini' | 'openai' | 'claude' | 'groq' | 'ollama'

export interface AIProvider {
  name: AIProviderName
  displayName: string
  generate(prompt: AIPrompt): Promise<AIResponse>
  isAvailable(): boolean
}

export interface AIPrompt {
  system: string
  user: string
  maxTokens: number
}

export interface AIResponse {
  content: string
  provider: AIProviderName
  tokensUsed: number
  success: boolean
  error?: 'quota_exceeded' | 'invalid_key' | 'safety_blocked' | 'timeout' | 'all_providers_failed'
}

export interface AIInput {
  stageKey: StageKey
  capabilityKeys: CapabilityKey[]
  parentEnergy: 'low' | 'medium' | 'high'
  spaceContext: SpaceContext
  companionType: CompanionType
  availableResources: ResourceKey[]
  // 去識別化的精確年齡（滿幾個月），由完整生日推出。讓 AI 更貼合月齡，
  // 但仍「不」傳孩子姓名或原始出生日期字串（去敏感化）。選填、向後相容。
  ageMonths?: number
}

export type SpaceContext =
  | 'anywhere'
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'outdoor_yard'
  | 'park'
  | 'car'
  | 'waiting_area'

export type CompanionType =
  | 'play'
  | 'talk'
  | 'read'
  | 'outdoor'
  | 'creative'
  | 'sensory'
  | 'music'
  | 'calm_down'

export type ResourceKey =
  | 'none'
  | 'books'
  | 'blocks'
  | 'balls'
  | 'paper_crayons'
  | 'cushions'
  | 'music'
  | 'water'
  | 'kitchen_items'

export const ALLOWED_SPACE_CONTEXTS: SpaceContext[] = [
  'anywhere',
  'living_room',
  'bedroom',
  'kitchen',
  'outdoor_yard',
  'park',
  'car',
  'waiting_area',
]

export const ALLOWED_COMPANION_TYPES: CompanionType[] = [
  'play',
  'talk',
  'read',
  'outdoor',
  'creative',
  'sensory',
  'music',
  'calm_down',
]

export const ALLOWED_RESOURCE_KEYS: ResourceKey[] = [
  'none',
  'books',
  'blocks',
  'balls',
  'paper_crayons',
  'cushions',
  'music',
  'water',
  'kitchen_items',
]
