import { describe, expect, it, vi } from 'vitest'
import { fetchRecommendations } from './client'
import type { RecommendRequestBody } from './companion-store'

const body: RecommendRequestBody = {
  ageMonths: 30,
  parentEnergy: 'low',
  companionContext: 'normal',
  space: 'anywhere',
  availableMinutes: 10,
  availableResources: [],
}

describe('fetchRecommendations', () => {
  it('成功時回傳解析後的結果', async () => {
    const payload = { recommendations: [], usedFallback: true }
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )

    const result = await fetchRecommendations(body, fetchImpl as unknown as typeof fetch)
    expect(result).toEqual(payload)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/recommend',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('失敗時丟出伺服器回傳的錯誤訊息', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: '輸入格式不正確' }), { status: 400 }),
    )
    await expect(fetchRecommendations(body, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      '輸入格式不正確',
    )
  })

  it('沒有錯誤內文時使用預設訊息', async () => {
    const fetchImpl = vi.fn(async () => new Response('not json', { status: 500 }))
    await expect(fetchRecommendations(body, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      '推薦請求失敗（500）',
    )
  })
})
