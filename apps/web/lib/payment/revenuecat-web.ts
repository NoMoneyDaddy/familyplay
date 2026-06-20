import { ErrorCode, Purchases } from '@revenuecat/purchases-js'

// RevenueCat Web Billing 前端封裝（client-only，SDK 用 window）。
// 「公開金鑰未設定即休眠」：未設 NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY 時視為不可用，
// 呼叫端據此停用結帳入口。appUserId 必須等於 user_profiles.id（webhook 對應權益）。

type WebPlan = 'supporter' | 'plus'

function webKey(): string | null {
  const k = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY
  return k && k.length > 0 ? k : null
}

export function isWebPurchasesAvailable(): boolean {
  return webKey() !== null
}

// plan → RevenueCat package identifier（dashboard 設定，用環境變數帶入）。
function packageIdFor(plan: WebPlan): string | undefined {
  return plan === 'plus'
    ? process.env.NEXT_PUBLIC_REVENUECAT_PLUS_PACKAGE
    : process.env.NEXT_PUBLIC_REVENUECAT_SUPPORTER_PACKAGE
}

export class WebPurchaseError extends Error {}

/**
 * 透過 RevenueCat Web Billing 購買方案。回傳是否取得有效權益（使用者取消 → false）。
 * 實際 entitlements 由 RevenueCat webhook（service-role）回寫。
 */
export async function purchasePlan(appUserId: string, plan: WebPlan): Promise<boolean> {
  const apiKey = webKey()
  if (!apiKey) throw new WebPurchaseError('web 收費尚未設定')

  const purchases = Purchases.configure({ apiKey, appUserId })
  const offerings = await purchases.getOfferings()
  const pkgs = offerings.current?.availablePackages ?? []

  // 計費正確性：必須以該方案設定的 package id 精準對應，缺設定／找不到一律 fail-closed，
  // 絕不退回 pkgs[0]（否則選 Plus 可能扣到別的方案）。
  const wantedId = packageIdFor(plan)
  if (!wantedId) throw new WebPurchaseError('方案尚未設定，請稍後再試')
  const pkg = pkgs.find((p) => p.identifier === wantedId)
  if (!pkg) throw new WebPurchaseError('找不到對應方案')

  try {
    const { customerInfo } = await purchases.purchase({ rcPackage: pkg })
    return Object.keys(customerInfo.entitlements.active).length > 0
  } catch (e: unknown) {
    // 使用者主動取消不是錯誤
    if (
      e &&
      typeof e === 'object' &&
      'errorCode' in e &&
      (e as { errorCode?: number }).errorCode === ErrorCode.UserCancelledError
    ) {
      return false
    }
    throw new WebPurchaseError('結帳失敗，請稍後再試')
  }
}
