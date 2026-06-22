import { describe, expect, it } from 'vitest'
import { resolveAiModel } from '../lib/ai-activity'

describe('resolveAiModel', () => {
  const env = { gemini: 'env-gemini', groq: '', openai: undefined }

  it('使用者填的模型優先', () => {
    expect(resolveAiModel('gemini', 'my-model', env)).toBe('my-model')
    expect(resolveAiModel('groq', '  spaced  ', env)).toBe('spaced')
  })

  it('沒填則用 env 預設', () => {
    expect(resolveAiModel('gemini', undefined, env)).toBe('env-gemini')
    expect(resolveAiModel('gemini', '   ', env)).toBe('env-gemini')
  })

  it('使用者與 env 都沒有 → 空字串（無法生成）', () => {
    expect(resolveAiModel('groq', undefined, env)).toBe('')
    expect(resolveAiModel('openai', undefined, env)).toBe('')
    expect(resolveAiModel('openai', '', env)).toBe('')
  })
})
