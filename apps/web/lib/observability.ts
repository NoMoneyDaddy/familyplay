import * as Sentry from '@sentry/nextjs'

// 統一錯誤回報：寫 server log（保留既有除錯習慣）+ 送 Sentry（instrumentation 已初始化）。
// 用在 API route 的「非預期 500」catch，避免生產錯誤只進 stdout、在監控看不到。
// 預期內的客戶端錯誤（zod 400、找不到 404 等）不需回報，別污染告警。
//
// context 慣例（讓一線運維 5 分鐘內定位「哪個用戶／哪個孩子」）：
//   - route:     端點路徑（必帶）
//   - userId:    觸發錯誤的使用者（auth user id 或 profile id）→ Sentry 可按用戶分群/反查
//   - childId:   相關孩子（若適用）→ 設為 tag 可篩選
//   - requestId: 串接同一請求的多條紀錄（若有）
// userId/childId/requestId 之外的欄位一律掛 extra context，不影響既有呼叫端。
export interface ErrorContext {
  route?: string
  userId?: string | null
  childId?: string | null
  requestId?: string | null
  [key: string]: unknown
}

export function reportError(error: unknown, context?: ErrorContext): void {
  if (!error) return // 空值不上報，避免無意義的 Sentry 事件
  // server log 帶完整 context，stdout 也能快速定位（含 logId 等自訂擴充欄位，不漏資訊）
  console.error(context?.route ?? 'error', context, error)
  try {
    Sentry.withScope((scope) => {
      if (context?.userId) scope.setUser({ id: String(context.userId) })
      if (context?.childId) scope.setTag('childId', String(context.childId))
      if (context?.requestId) scope.setTag('requestId', String(context.requestId))
      if (context?.route) scope.setTag('route', String(context.route))
      if (context) scope.setContext('detail', context)
      Sentry.captureException(error)
    })
  } catch {
    // Sentry 未初始化或失敗時不影響回應流程
  }
}
