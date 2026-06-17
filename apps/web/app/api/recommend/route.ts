// 推薦 API —— POST /api/recommend
// 輸入經 Zod 白名單驗證後交給純 TS 推薦引擎處理。
// 活動優先從 Supabase（RLS）載入，未登入或無法取得時降級到內建活動庫。

import { loadActivitiesFromDb } from '@/lib/activities'
import { getRecommendations } from '@/lib/recommend'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '請求內容不是合法 JSON' }, { status: 400 })
  }

  const activities = await loadActivitiesFromDb()
  const outcome = activities ? getRecommendations(body, activities) : getRecommendations(body)
  if (!outcome.ok) {
    return Response.json(
      { error: outcome.error, issues: outcome.issues },
      { status: outcome.status },
    )
  }

  return Response.json(outcome.result)
}
