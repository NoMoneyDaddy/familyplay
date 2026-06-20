import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// /api/sponsors route handler 整合測試（白皮書 C2：sponsor_cards 廣告渲染）。
// 公開讀取、版位過濾、載入失敗安靜回空（贊助內容缺失不影響頁面）。

const h = vi.hoisted(() => ({
  rows: [] as unknown[] | null,
  error: null as unknown,
  reportError: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/observability', () => ({ reportError: h.reportError }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: h.rows, error: h.error }) }) }),
    }),
  }),
}))

import { GET } from '../app/api/sponsors/route'

const req = (placement?: string) =>
  new Request(`http://localhost/api/sponsors${placement ? `?placement=${placement}` : ''}`)

beforeEach(() => {
  h.rows = []
  h.error = null
  h.reportError.mockClear()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/sponsors', () => {
  it('未設定 Supabase env → 回空 cards', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const json = await (await GET(req('recommendations'))).json()
    expect(json).toEqual({ cards: [] })
  })

  it('依版位過濾並映射 camelCase', async () => {
    h.rows = [
      {
        id: 'a',
        title: 't',
        body: 'b',
        cta_text: '看',
        cta_url: 'https://x',
        allowed_placements: ['recommendations'],
      },
      {
        id: 'b',
        title: 't2',
        body: 'b2',
        cta_text: null,
        cta_url: null,
        allowed_placements: ['history'],
      },
    ]
    const json = await (await GET(req('recommendations'))).json()
    expect(json.cards).toHaveLength(1)
    expect(json.cards[0]).toEqual({
      id: 'a',
      title: 't',
      body: 'b',
      ctaText: '看',
      ctaUrl: 'https://x',
    })
  })

  it('非白名單 placement → 當作 recommendations（不報錯）', async () => {
    h.rows = [
      { id: 'a', title: 't', body: 'b', cta_text: null, cta_url: null, allowed_placements: [] },
    ]
    const json = await (await GET(req('evil-injection'))).json()
    expect(json.cards).toHaveLength(1)
  })

  it('DB 失敗（SponsorError）→ 安靜回空、不上報', async () => {
    h.error = { message: 'boom' }
    const json = await (await GET(req('recommendations'))).json()
    expect(json).toEqual({ cards: [] })
    expect(h.reportError).not.toHaveBeenCalled()
  })
})
