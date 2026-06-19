import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProvider } from './providers'
import type { AIProvider, AIProviderName } from './types'

// 測試輔助：取得 provider 並斷言非 null（避免在每處用非空斷言 `!`）
function mustProvider(name: AIProviderName, opts: Parameters<typeof getProvider>[1]): AIProvider {
  const p = getProvider(name, opts)
  if (!p) throw new Error(`expected provider for ${name}`)
  return p
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('getProvider', () => {
  it('有 key 才回傳雲端 provider', () => {
    expect(getProvider('gemini', { apiKey: 'k' })?.name).toBe('gemini')
    expect(getProvider('gemini', {})).toBeNull()
    expect(getProvider('groq', { apiKey: 'k' })?.name).toBe('groq')
    expect(getProvider('groq', {})).toBeNull()
  })

  it('ollama 免 key（本地）', () => {
    expect(getProvider('ollama', {})?.name).toBe('ollama')
  })

  it('未實作的 provider 回 null', () => {
    expect(getProvider('claude', { apiKey: 'k' })).toBeNull()
  })
})

describe('gemini provider generate', () => {
  it('成功時取出文字內容', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"title":"嗨"}' }] } }],
          usageMetadata: { totalTokenCount: 42 },
        }),
      })),
    )
    const provider = mustProvider('gemini', { apiKey: 'k', model: 'test-model' })
    const res = await provider.generate({ system: 's', user: 'u', maxTokens: 100 })
    expect(res.success).toBe(true)
    expect(res.content).toContain('嗨')
    expect(res.tokensUsed).toBe(42)
  })

  it('401 映射成 invalid_key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
    )
    const provider = mustProvider('gemini', { apiKey: 'bad', model: 'test-model' })
    const res = await provider.generate({ system: 's', user: 'u', maxTokens: 100 })
    expect(res.success).toBe(false)
    expect(res.error).toBe('invalid_key')
  })

  it('429 映射成 quota_exceeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })),
    )
    const provider = mustProvider('gemini', { apiKey: 'k', model: 'test-model' })
    const res = await provider.generate({ system: 's', user: 'u', maxTokens: 100 })
    expect(res.error).toBe('quota_exceeded')
  })

  it('網路丟例外不會 throw，回 all_providers_failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down')
      }),
    )
    const provider = mustProvider('gemini', { apiKey: 'k', model: 'test-model' })
    const res = await provider.generate({ system: 's', user: 'u', maxTokens: 100 })
    expect(res.success).toBe(false)
    expect(res.error).toBe('all_providers_failed')
  })

  it('逾時（AbortError）映射成 timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const e = new Error('aborted')
        e.name = 'AbortError'
        throw e
      }),
    )
    const provider = mustProvider('gemini', { apiKey: 'k', model: 'test-model' })
    const res = await provider.generate({ system: 's', user: 'u', maxTokens: 100 })
    expect(res.error).toBe('timeout')
  })
})

describe('groq provider generate (OpenAI 相容)', () => {
  it('取出 choices[0].message.content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '哈囉' } }],
          usage: { total_tokens: 7 },
        }),
      })),
    )
    const provider = mustProvider('groq', { apiKey: 'k', model: 'test-model' })
    const res = await provider.generate({ system: 's', user: 'u', maxTokens: 100 })
    expect(res.content).toBe('哈囉')
    expect(res.tokensUsed).toBe(7)
  })
})
