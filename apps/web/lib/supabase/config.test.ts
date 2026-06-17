import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseEnv, isSupabaseConfigured } from './config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('supabase config', () => {
  it('缺少環境變數時回傳 null / false', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(getSupabaseEnv()).toBeNull()
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('環境變數齊全時回傳設定', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    expect(getSupabaseEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    })
    expect(isSupabaseConfigured()).toBe(true)
  })
})
