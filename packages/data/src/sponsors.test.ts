import { describe, expect, it } from 'vitest'
import { fetchActiveSponsorCards, mapSponsorRow, type SponsorRow } from './sponsors'

const row: SponsorRow = {
  id: 's1',
  title: '在地親子館',
  body: '雨天也能放電',
  cta_text: '看看',
  cta_url: 'https://example.com',
  allowed_placements: ['recommendations'],
}

describe('mapSponsorRow', () => {
  it('映射欄位為 camelCase', () => {
    expect(mapSponsorRow(row)).toEqual({
      id: 's1',
      title: '在地親子館',
      body: '雨天也能放電',
      ctaText: '看看',
      ctaUrl: 'https://example.com',
    })
  })
})

function makeSupabase(data: SponsorRow[] | null, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data, error }) }) }),
    }),
    // biome-ignore lint/suspicious/noExplicitAny: 測試用最小化 mock
  } as any
}

describe('fetchActiveSponsorCards', () => {
  it('依版位過濾：空 allowed_placements = 不限版位', async () => {
    const supabase = makeSupabase([
      { ...row, id: 'a', allowed_placements: ['recommendations'] },
      { ...row, id: 'b', allowed_placements: [] },
      { ...row, id: 'c', allowed_placements: ['history'] },
    ])
    const cards = await fetchActiveSponsorCards(supabase, 'recommendations')
    expect(cards.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('limit 限量', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ...row,
      id: `r${i}`,
      allowed_placements: [],
    }))
    const cards = await fetchActiveSponsorCards(makeSupabase(rows), 'anywhere', 2)
    expect(cards).toHaveLength(2)
  })

  it('null data → 空陣列', async () => {
    expect(await fetchActiveSponsorCards(makeSupabase(null), 'x')).toEqual([])
  })

  it('查詢錯誤 → SponsorError', async () => {
    await expect(
      fetchActiveSponsorCards(makeSupabase(null, { message: 'boom' }), 'x'),
    ).rejects.toThrow('無法載入贊助內容')
  })
})
