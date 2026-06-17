import type {
  CapabilityKey,
  CompanionType,
  ParentEnergy,
  ResourceKey,
  SpaceContext,
  StageKey,
} from '@familyplay/core'

export type {
  ParentEnergy,
  SpaceContext,
  CompanionType,
  ResourceKey,
} from '@familyplay/core'

export {
  ALLOWED_PARENT_ENERGY_LEVELS,
  ALLOWED_SPACE_CONTEXTS,
  ALLOWED_COMPANION_TYPES,
  ALLOWED_RESOURCE_KEYS,
} from '@familyplay/core'

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
  parentEnergy: ParentEnergy
  spaceContext: SpaceContext
  companionType: CompanionType
  availableResources: ResourceKey[]
}
