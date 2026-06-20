import { Platform } from 'react-native'
import Purchases, { type PurchasesPackage } from 'react-native-purchases'

// RevenueCat 行動端 IAP 封裝。全程「金鑰未設定即休眠」：沒有 EXPO_PUBLIC_REVENUECAT_*
// 時所有函式安靜 no-op，收費入口不顯示購買按鈕，App 不致崩潰。
// appUserID 必須等於 user_profiles.id —— webhook 以 app_user_id 對應 entitlements.user_profile_id。

let configured = false

function apiKey(): string | null {
  const k = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  })
  return k && k.length > 0 ? k : null
}

/** 是否已設定 RevenueCat 金鑰（決定要不要顯示購買入口）。 */
export function isPurchasesAvailable(): boolean {
  return apiKey() !== null
}

function ensureConfigured(): boolean {
  if (configured) return true
  const key = apiKey()
  if (!key) return false
  Purchases.configure({ apiKey: key })
  configured = true
  return true
}

/** 將購買者綁定到我們的 user_profiles.id（讓 webhook 能正確對應權益）。 */
export async function identifyPurchaser(profileId: string): Promise<void> {
  if (!ensureConfigured()) return
  await Purchases.logIn(profileId)
}

/** 取得目前 offering 的可購買方案；未設定金鑰回空陣列。 */
export async function getPlanPackages(): Promise<PurchasesPackage[]> {
  if (!ensureConfigured()) return []
  const offerings = await Purchases.getOfferings()
  return offerings.current?.availablePackages ?? []
}

export class PurchaseError extends Error {}

/**
 * 恢復先前的購買（App Store / Google Play 政策要求訂閱頁必須提供）。
 * 回傳是否擁有有效權益。實際 entitlements 仍以 RevenueCat webhook 回寫為準。
 */
export async function restorePurchases(): Promise<boolean> {
  if (!ensureConfigured()) throw new PurchaseError('收費尚未設定')
  const customerInfo = await Purchases.restorePurchases()
  return Object.keys(customerInfo.entitlements.active).length > 0
}

/**
 * 購買指定方案。回傳是否取得有效權益。使用者主動取消視為 false（非錯誤）。
 * 實際的 entitlements 由 RevenueCat webhook（service-role）回寫，前端僅觸發購買。
 */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  if (!ensureConfigured()) throw new PurchaseError('收費尚未設定')
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    return Object.keys(customerInfo.entitlements.active).length > 0
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'userCancelled' in e &&
      (e as { userCancelled?: boolean }).userCancelled
    ) {
      return false
    }
    throw new PurchaseError('購買失敗，請稍後再試')
  }
}
