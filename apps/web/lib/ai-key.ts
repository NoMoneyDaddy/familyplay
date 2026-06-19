'use client'

// 免費版「自帶 AI 金鑰」(BYO key) 的本機儲存。
//
// 安全（CLAUDE.md「絕對不能做」）：金鑰只存在 sessionStorage——關閉分頁即清除、
// 不進資料庫、不寫 log、不用 NEXT_PUBLIC。每次請求才從這裡讀出、隨請求送到後端用完即丟。
// localStorage 在隱私模式可能 throw，全包 try-catch。

export type AIProviderChoice = 'gemini' | 'groq' | 'openai' | 'ollama'

export interface StoredAIKey {
  provider: AIProviderChoice
  apiKey?: string
}

const STORAGE_KEY = 'fp_ai_byok'

export function readAIKey(): StoredAIKey | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAIKey
    if (!parsed?.provider) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAIKey(value: StoredAIKey): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // 無法寫入僅代表此分頁不能用 AI；不影響其他功能
  }
}

export function clearAIKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {}
}

/** 是否已設定可用的金鑰（ollama 本地免 key）。 */
export function hasAIKey(): boolean {
  const k = readAIKey()
  if (!k) return false
  return k.provider === 'ollama' || !!k.apiKey
}
