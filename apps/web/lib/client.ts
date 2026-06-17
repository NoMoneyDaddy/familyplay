// 呼叫推薦 API 的瀏覽器端封裝。fetchImpl 可注入，方便測試。

import type { RecommendationResult } from '@familyplay/core'
import type { RecommendRequestBody } from './companion-store'

export async function fetchRecommendations(
  body: RecommendRequestBody,
  fetchImpl: typeof fetch = fetch,
): Promise<RecommendationResult> {
  const res = await fetchImpl('/api/recommend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? `推薦請求失敗（${res.status}）`)
  }

  return (await res.json()) as RecommendationResult
}
