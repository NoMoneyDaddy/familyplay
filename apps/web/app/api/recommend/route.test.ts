import { describe, expect, it } from 'vitest'
import { POST } from './route'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/recommend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/recommend', () => {
  it('合法請求回傳 200 與推薦', async () => {
    const res = await POST(
      postRequest({
        ageMonths: 40,
        parentEnergy: 'medium',
        availableMinutes: 30,
        space: 'anywhere',
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.recommendations)).toBe(true)
    expect(json.recommendations.length).toBeGreaterThan(0)
  })

  it('非法 JSON 回傳 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recommend', { method: 'POST', body: '{ not json' }),
    )
    expect(res.status).toBe(400)
  })

  it('未通過白名單驗證回傳 400', async () => {
    const res = await POST(postRequest({ ageMonths: -5 }))
    expect(res.status).toBe(400)
  })
})
