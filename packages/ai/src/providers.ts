import type { AIPrompt, AIProvider, AIProviderName, AIResponse } from './types'

// 具體 AI Provider 實作。
//
// 設計重點（對應 CLAUDE.md AI 安全規則）：
//   - API Key 只在記憶體存活於單次請求，不寫 log、不存 DB；本檔不做任何 log。
//   - 逾時保護：每個 provider 都用 AbortController 在 timeoutMs 後中止。
//   - 錯誤一律映射成 AIResponse.error 聯集，由 generateSafe 統一降回規則式推薦。
//
// 免費版「串自己的 key」優先支援的免費/低成本 provider：Gemini、Groq、Ollama。

const DEFAULT_TIMEOUT_MS = 12_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function mapHttpError(status: number): NonNullable<AIResponse['error']> {
  if (status === 401 || status === 403) return 'invalid_key'
  if (status === 429) return 'quota_exceeded'
  return 'all_providers_failed'
}

interface ProviderOptions {
  apiKey?: string
  /** Ollama 等本地端點的 base URL（例如 http://localhost:11434） */
  baseUrl?: string
  /** 覆寫預設模型 */
  model?: string
  timeoutMs?: number
}

// ── Gemini（Google Generative Language REST）─────────────────────────
export function createGeminiProvider(opts: ProviderOptions): AIProvider {
  const apiKey = opts.apiKey || ''
  const model = opts.model || 'gemini-1.5-flash'
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    name: 'gemini',
    displayName: 'Google Gemini',
    isAvailable: () => apiKey.length > 0,
    async generate(prompt: AIPrompt): Promise<AIResponse> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: prompt.system }] },
            contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
            generationConfig: { maxOutputTokens: prompt.maxTokens, temperature: 0.9 },
          }),
        },
        timeoutMs,
      )
      if (!res.ok) {
        return {
          content: '',
          provider: 'gemini',
          tokensUsed: 0,
          success: false,
          error: mapHttpError(res.status),
        }
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
        usageMetadata?: { totalTokenCount?: number }
      }
      const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
      return {
        content,
        provider: 'gemini',
        tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
        success: content.length > 0,
        error: content.length > 0 ? undefined : 'all_providers_failed',
      }
    },
  }
}

// ── OpenAI 相容 chat completions（OpenAI / Groq 共用）─────────────────
function createOpenAICompatProvider(
  name: AIProviderName,
  displayName: string,
  baseUrl: string,
  defaultModel: string,
  opts: ProviderOptions,
): AIProvider {
  const apiKey = opts.apiKey || ''
  const model = opts.model || defaultModel
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    name,
    displayName,
    isAvailable: () => apiKey.length > 0,
    async generate(prompt: AIPrompt): Promise<AIResponse> {
      const res = await fetchWithTimeout(
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            max_tokens: prompt.maxTokens,
            temperature: 0.9,
            messages: [
              { role: 'system', content: prompt.system },
              { role: 'user', content: prompt.user },
            ],
          }),
        },
        timeoutMs,
      )
      if (!res.ok) {
        return {
          content: '',
          provider: name,
          tokensUsed: 0,
          success: false,
          error: mapHttpError(res.status),
        }
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
        usage?: { total_tokens?: number }
      }
      const content = data.choices?.[0]?.message?.content || ''
      return {
        content,
        provider: name,
        tokensUsed: data.usage?.total_tokens ?? 0,
        success: content.length > 0,
        error: content.length > 0 ? undefined : 'all_providers_failed',
      }
    },
  }
}

export function createGroqProvider(opts: ProviderOptions): AIProvider {
  return createOpenAICompatProvider(
    'groq',
    'Groq',
    'https://api.groq.com/openai/v1',
    'llama-3.3-70b-versatile',
    opts,
  )
}

export function createOpenAIProvider(opts: ProviderOptions): AIProvider {
  return createOpenAICompatProvider(
    'openai',
    'OpenAI',
    'https://api.openai.com/v1',
    'gpt-4o-mini',
    opts,
  )
}

// ── Ollama（本地端點，免 key）──────────────────────────────────────
export function createOllamaProvider(opts: ProviderOptions): AIProvider {
  const baseUrl = (opts.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
  const model = opts.model || 'llama3.2'
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    name: 'ollama',
    displayName: 'Ollama（本地）',
    isAvailable: () => baseUrl.length > 0,
    async generate(prompt: AIPrompt): Promise<AIResponse> {
      const res = await fetchWithTimeout(
        `${baseUrl}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            options: { num_predict: prompt.maxTokens, temperature: 0.9 },
            messages: [
              { role: 'system', content: prompt.system },
              { role: 'user', content: prompt.user },
            ],
          }),
        },
        timeoutMs,
      )
      if (!res.ok) {
        return {
          content: '',
          provider: 'ollama',
          tokensUsed: 0,
          success: false,
          error: mapHttpError(res.status),
        }
      }
      const data = (await res.json()) as {
        message?: { content?: string }
        eval_count?: number
      }
      const content = data.message?.content || ''
      return {
        content,
        provider: 'ollama',
        tokensUsed: data.eval_count ?? 0,
        success: content.length > 0,
        error: content.length > 0 ? undefined : 'all_providers_failed',
      }
    },
  }
}

/** 依名稱取得 provider 實例；未知/缺 key 回 null（呼叫端據此降回規則式）。 */
export function getProvider(name: AIProviderName, opts: ProviderOptions): AIProvider | null {
  switch (name) {
    case 'gemini':
      return opts.apiKey ? createGeminiProvider(opts) : null
    case 'groq':
      return opts.apiKey ? createGroqProvider(opts) : null
    case 'openai':
      return opts.apiKey ? createOpenAIProvider(opts) : null
    case 'ollama':
      return createOllamaProvider(opts)
    default:
      // claude 等尚未實作的 provider
      return null
  }
}
