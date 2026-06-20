import { timingSafeEqual } from 'node:crypto'

// RevenueCat webhook 共用純邏輯（可單元測試）。文件：https://www.revenuecat.com/docs/webhooks
// RevenueCat 是行動端 IAP（StoreKit/Play Billing）與 Web Billing 的統一封裝；entitlement
// 跨 store 抽象（例如 "supporter"/"plus"），webhook 事件帶 entitlement_ids 與 product_id。

export type Plan = 'supporter' | 'plus'

// 我們處理的事件分類。CANCELLATION = 關閉自動續訂（仍可用到到期），不立即撤銷；
// 撤銷只在 EXPIRATION（與 store 行為一致，避免提早收回已付費的權益）。
const ACTIVATING_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
])
const DEACTIVATING_EVENTS = new Set(['EXPIRATION'])

export interface RevenueCatEvent {
  type: string
  id: string
  app_user_id?: string
  original_app_user_id?: string
  product_id?: string
  entitlement_ids?: string[] | null
  expiration_at_ms?: number | null
  purchased_at_ms?: number | null
}

export interface PlanConfig {
  supporterEntitlement: string
  plusEntitlement: string
  // 選填：以 product_id 比對的後備（不同 store 的 product_id 不同，用逗號分隔的環境變數帶入）
  supporterProductIds?: string[]
  plusProductIds?: string[]
}

export type EventAction = 'activate' | 'deactivate' | 'ignore'

export function classifyEvent(type: string): EventAction {
  if (ACTIVATING_EVENTS.has(type)) return 'activate'
  if (DEACTIVATING_EVENTS.has(type)) return 'deactivate'
  return 'ignore'
}

/**
 * 由事件推出方案。優先用 RevenueCat entitlement_ids（跨 store 抽象），
 * 後備用 product_id 比對。Plus 優先於 supporter（同時持有時給較高方案）。
 */
export function planFromEvent(event: RevenueCatEvent, config: PlanConfig): Plan | null {
  const ents = new Set(event.entitlement_ids || [])
  if (ents.has(config.plusEntitlement)) return 'plus'
  if (ents.has(config.supporterEntitlement)) return 'supporter'

  const pid = event.product_id
  if (pid) {
    if (config.plusProductIds?.includes(pid)) return 'plus'
    if (config.supporterProductIds?.includes(pid)) return 'supporter'
  }
  return null
}

/**
 * 驗證 RevenueCat webhook 的 Authorization 標頭（RevenueCat 後台可設定一個固定值）。
 * 用 timingSafeEqual 避免計時攻擊；長度不符直接回 false（timingSafeEqual 長度不等會 throw）。
 */
export function verifyRevenueCatAuth(header: string | null | undefined, expected: string): boolean {
  if (!header || !expected) return false
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** 解析到期時間（ms epoch）；缺漏或不合法時回退 +30 天，避免 toISOString throw。 */
export function resolveExpiry(expirationAtMs: number | null | undefined): Date {
  const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  if (expirationAtMs == null) return fallback
  const d = new Date(expirationAtMs)
  return Number.isNaN(d.getTime()) ? fallback : d
}
