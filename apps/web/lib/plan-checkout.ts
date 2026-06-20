import { isWebPurchasesAvailable } from '@/lib/payment/revenuecat-web'

// 付費結帳「就緒」判斷（集中、可測，守住金流不被誤開）。
//
// 規則：
// - 任何付費方案都需 RevenueCat web 公開金鑰已設（isWebPurchasesAvailable）。
// - Plus 另需顯式開關 NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED='true'——RevenueCat 後台商品/權益
//   設好、確認可收費後才翻開，無需改碼。預設關閉 → Plus 顯示「即將推出」。

export type PaidPlan = 'supporter' | 'plus'

/** Plus 結帳開關是否打開（環境變數，預設關）。 */
export function plusCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED === 'true'
}

/** 該付費方案是否可開放結帳。未就緒時上層應顯示「即將推出」而非會跳錯的購買鈕。 */
export function checkoutReadyFor(planId: PaidPlan): boolean {
  if (!isWebPurchasesAvailable()) return false
  return planId === 'plus' ? plusCheckoutEnabled() : true
}
