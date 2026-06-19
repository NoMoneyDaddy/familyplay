import * as Sentry from '@sentry/nextjs'

// 統一錯誤回報：寫 server log（保留既有除錯習慣）+ 送 Sentry（instrumentation 已初始化）。
// 用在 API route 的「非預期 500」catch，避免生產錯誤只進 stdout、在監控看不到。
// 預期內的客戶端錯誤（zod 400、找不到 404 等）不需回報，別污染告警。
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error(context?.route ?? 'error', error)
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } catch {
    // Sentry 未初始化或失敗時不影響回應流程
  }
}
