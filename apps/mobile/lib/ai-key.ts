import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

// 手機端「自帶 AI 金鑰」(BYO key)。讓家長用自己在 AI 服務申請的金鑰，在「都玩過了」時請 AI
// 生一個新活動。安全（對齊 CLAUDE.md AI 安全）：金鑰只存在這台裝置的 SecureStore（加密保存）、
// 不進資料庫、不寫 log；生成時才從這裡讀出、直接送到使用者選的 AI 服務、用完即丟。
//
// 只支援需金鑰的雲端服務（gemini/groq/openai）；不放 ollama（手機上沒有本機伺服器，且涉及
// 連到任意位址，安全考量略過）。
export type MobileAIProvider = 'gemini' | 'groq' | 'openai'

export const MOBILE_AI_PROVIDERS: readonly MobileAIProvider[] = [
  'gemini',
  'groq',
  'openai',
] as const

export interface StoredAIKey {
  provider: MobileAIProvider
  apiKey: string
  // 模型名稱（選填）。未填時改用 build 時設定的 EXPO_PUBLIC_AI_<provider>_MODEL；都沒有則無法生成。
  model?: string
}

const KEY = 'familyplay.aiKey'

function isValid(v: Partial<StoredAIKey> | null | undefined): v is StoredAIKey {
  return (
    !!v &&
    typeof v.apiKey === 'string' &&
    v.apiKey.length > 0 &&
    MOBILE_AI_PROVIDERS.includes(v.provider as MobileAIProvider)
  )
}

interface AIKeyStore {
  config: StoredAIKey | null
  hydrated: boolean
  hydrate: () => Promise<void>
  save: (config: StoredAIKey) => Promise<boolean>
  clear: () => void
}

export const useAIKeyStore = create<AIKeyStore>((set) => ({
  config: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY)
      const parsed = raw ? (JSON.parse(raw) as Partial<StoredAIKey>) : null
      set({ config: isValid(parsed) ? parsed : null, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
  save: async (config) => {
    if (!isValid(config)) return false
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(config))
      set({ config })
      return true
    } catch {
      // SecureStore 寫入失敗（極少見）→ 不更新，回 false 讓 UI 提示
      return false
    }
  },
  clear: () => {
    set({ config: null })
    SecureStore.deleteItemAsync(KEY).catch(() => {})
  },
}))
