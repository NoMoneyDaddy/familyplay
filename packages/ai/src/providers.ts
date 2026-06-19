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

// fetch/res.json 可能因網路、DNS、逾時（AbortError）或非 JSON 回應（502 HTML）拋出；
// 統一捕捉並映射成 AIResponse，呼叫端永遠拿到結構化結果、不會崩潰。
function errorResponse(provider: AIProviderName, err: unknown): AIResponse {
  const isTimeout = err instanceof Error && err.name === 'AbortError'
  return {
    content: '',
    provider,
    tokensUsed: 0,
    success: false,
    error: isTimeout ? 'timeout' : 'all_providers_failed',
  }
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
  // 不在 repo 寫死具體 model 版本識別碼；由呼叫端（app 層從環境變數讀）以 opts.model 帶入
  const model = opts.model || ''
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    name: 'gemini',
    displayName: 'Google Gemini',
    isAvailable: () => apiKey.length > 0 && model.length > 0,
    async generate(prompt: AIPrompt): Promise<AIResponse> {
      if (!model) return errorResponse('gemini', new Error('model not configured'))
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: prompt.system }] },
              contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
              // 原生 JSON mode：穩定輸出結構化 JSON、避免 markdown 圍欄
              generationConfig: {
                maxOutputTokens: prompt.maxTokens,
                temperature: 0.9,
                responseMimeType: 'application/json',
              },
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
        const content =
          data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
        return {
          content,
          provider: 'gemini',
          tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
          success: content.length > 0,
          error: content.length > 0 ? undefined : 'all_providers_failed',
        }
      } catch (err) {
        return errorResponse('gemini', err)
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
  // defaultModel 由各 provider 從環境變數帶入（不在 repo 寫死 model 版本識別碼）
  const model = opts.model || defaultModel
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    name,
    displayName,
    isAvailable: () => apiKey.length > 0 && model.length > 0,
    async generate(prompt: AIPrompt): Promise<AIResponse> {
      if (!model) return errorResponse(name, new Error('model not configured'))
      try {
        const res = await fetchWithTimeout(
          `${baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              max_tokens: prompt.maxTokens,
              temperature: 0.9,
              // 原生 JSON mode（提示已含 "JSON" 關鍵字，符合 OpenAI/Groq 要求）
              response_format: { type: 'json_object' },
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
      } catch (err) {
        return errorResponse(name, err)
      }
    },
  }
}

export function createGroqProvider(opts: ProviderOptions): AIProvider {
  return createOpenAICompatProvider('groq', 'Groq', 'https://api.groq.com/openai/v1', '', opts)
}

export function createOpenAIProvider(opts: ProviderOptions): AIProvider {
  return createOpenAICompatProvider('openai', 'OpenAI', 'https://api.openai.com/v1', '', opts)
}

// ── Ollama（本地端點，免 key）──────────────────────────────────────
export function createOllamaProvider(opts: ProviderOptions): AIProvider {
  const baseUrl = (opts.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
  const model = opts.model || ''
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return {
    name: 'ollama',
    displayName: 'Ollama（本地）',
    isAvailable: () => baseUrl.length > 0 && model.length > 0,
    async generate(prompt: AIPrompt): Promise<AIResponse> {
      if (!model) return errorResponse('ollama', new Error('model not configured'))
      try {
        const res = await fetchWithTimeout(
          `${baseUrl}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              stream: false,
              // 強制 JSON 輸出（本地小模型沒約束時 JSON 穩定度較低）
              format: 'json',
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
      } catch (err) {
        return errorResponse('ollama', err)
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
