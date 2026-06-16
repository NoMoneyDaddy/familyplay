// @ts-expect-error react-native-purchases doesn't have TypeScript definitions
import * as RCPurchases from 'react-native-purchases'
import { z } from 'zod'

// Plan type matching database enum
export type Plan = 'free' | 'supporter' | 'plus'

// Product ID schemas for validation
const ProductIdSchema = z.enum([
  'com.familyplay.supporter.monthly',
  'com.familyplay.plus.monthly',
  'com.familyplay.plus.yearly',
  'familyplay_supporter_monthly',
  'familyplay_plus_monthly',
  'familyplay_plus_yearly',
])

export type ProductId = z.infer<typeof ProductIdSchema>

// Map product IDs to plan types
const PRODUCT_ID_TO_PLAN: Record<string, Plan> = {
  // iOS
  'com.familyplay.supporter.monthly': 'supporter',
  'com.familyplay.plus.monthly': 'plus',
  'com.familyplay.plus.yearly': 'plus',
  // Android
  familyplay_supporter_monthly: 'supporter',
  familyplay_plus_monthly: 'plus',
  familyplay_plus_yearly: 'plus',
}

// Entitlements matching RevenueCat config
const ENTITLEMENTS = {
  SUPPORTER: 'supporter',
  PLUS: 'plus',
} as const

// Error types
export class RevenueCatError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'RevenueCatError'
  }
}

// Customer info type
export interface CustomerInfo {
  customerId: string
  activeEntitlements: string[]
  activeSubscriptions: string[]
  purchasedProductIdentifiers: string[]
  nonSubscriptionsPurchases: string[]
  allPurchasedProductIdentifiers: string[]
  latestExpirationDate?: string
}

// Purchase event type
export interface PurchaseEvent {
  productId: string
  transactionId: string
  purchaseDate: string
  customerId: string
}

let initializationPromise: Promise<void> | null = null
let purchaseCompleteListener: ((event: PurchaseEvent) => void) | null = null

/**
 * Initialize RevenueCat SDK with public API key and auth user ID
 * Should be called once during app launch after auth is established
 */
export async function initializeRevenueCat(authUserId: string): Promise<void> {
  // Prevent multiple concurrent initializations
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY
      if (!apiKey) {
        console.warn(
          '[RevenueCat] NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY not configured, skipping initialization',
        )
        return
      }

      // Configure RevenueCat SDK
      await RCPurchases.configure({
        apiKey,
        appUserID: authUserId,
        observerMode: false,
      })

      // Set up purchase update listener
      setupPurchaseListener()
    } catch (error) {
      console.error('[RevenueCat] Initialization error:', error)
      throw new RevenueCatError(
        `Failed to initialize RevenueCat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR',
      )
    }
  })()

  return initializationPromise
}

/**
 * Set up listener for purchase events
 */
function setupPurchaseListener(): void {
  if (purchaseCompleteListener === null) {
    // Listener for when purchases are updated
    RCPurchases.addPurchasesUpdatedListener(async (purchasesUpdated) => {
      try {
        const customerInfo = purchasesUpdated.customerInfo

        // Extract purchase information from updated customer info
        if (
          customerInfo.entitlements.active &&
          Object.keys(customerInfo.entitlements.active).length > 0
        ) {
          // Get the latest transaction details
          const allPurchases = Object.values(customerInfo.allPurchaseDatesByProductId || {})
          if (allPurchases.length > 0) {
            const mostRecentPurchase = allPurchases[allPurchases.length - 1]
            const activeEntitlement = Object.keys(customerInfo.entitlements.active)[0]

            if (purchaseCompleteListener) {
              purchaseCompleteListener({
                productId: activeEntitlement,
                transactionId:
                  customerInfo.originalTransactionId || (customerInfo as any).managementURL || '',
                purchaseDate: mostRecentPurchase,
                customerId: customerInfo.originalAppUserId || '',
              })
            }
          }
        }
      } catch (error) {
        console.error('[RevenueCat] Error processing purchase update:', error)
      }
    })
  }
}

/**
 * Get current customer info and active entitlements
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    const customerInfo = await RCPurchases.getCustomerInfo()

    return {
      customerId: customerInfo.originalAppUserId || '',
      activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
      activeSubscriptions: customerInfo.activeSubscriptions,
      purchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      nonSubscriptionsPurchases: customerInfo.nonSubscriptionsPurchases,
      allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      latestExpirationDate: customerInfo.latestExpirationDate,
    }
  } catch (error) {
    throw new RevenueCatError(
      `Failed to fetch customer info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FETCH_ERROR',
    )
  }
}

/**
 * Get active plan based on customer entitlements
 */
export async function getActivePlan(): Promise<Plan> {
  try {
    const customerInfo = await getCustomerInfo()

    // Check which entitlements are active
    if (customerInfo.activeEntitlements.includes(ENTITLEMENTS.PLUS)) {
      return 'plus'
    }

    if (customerInfo.activeEntitlements.includes(ENTITLEMENTS.SUPPORTER)) {
      return 'supporter'
    }

    return 'free'
  } catch (error) {
    console.error('[RevenueCat] Error getting active plan:', error)
    return 'free'
  }
}

/**
 * Show purchase UI for a specific product
 */
export async function showPurchaseUI(productId: string): Promise<void> {
  try {
    // Validate product ID
    const validated = ProductIdSchema.parse(productId)
    const offerings = await RCPurchases.getOfferings()

    if (!offerings.current) {
      throw new RevenueCatError('No current offering available', 'NO_OFFERING')
    }

    const package_ = offerings.current.availablePackages.find((pkg: any) => pkg.identifier === validated)

    if (!package_) {
      throw new RevenueCatError(`Product not found: ${productId}`, 'PRODUCT_NOT_FOUND')
    }

    // Initiate purchase
    await RCPurchases.purchasePackage(package_)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      // User cancelled or other purchase error
      const e = error as any
      if (e.code === 'PURCHASE_CANCELLED_ERROR') {
        return
      }
    }

    throw new RevenueCatError(
      `Failed to show purchase UI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PURCHASE_ERROR',
    )
  }
}

/**
 * Register callback for when a purchase completes
 * Called from app layout to wire up purchase events to backend API
 */
export function onPurchaseComplete(callback: (event: PurchaseEvent) => void): void {
  purchaseCompleteListener = callback
}

/**
 * Open app settings to manage subscription
 * Works on both iOS and Android
 */
export async function openSubscriptionSettings(): Promise<void> {
  try {
    const customerInfo = await getCustomerInfo()

    if (customerInfo.activeSubscriptions.length === 0) {
      console.warn('[RevenueCat] No active subscriptions to manage')
      return
    }

    // RevenueCat provides management URL
    // For app-based management, open system settings
    // iOS: Settings > AppName > Subscriptions
    // Android: Google Play Store > My apps & games > Subscriptions
    const managementURL = (customerInfo as any).managementURL
    if (managementURL) {
      // Use web-based management if available
      const { Linking } = require('react-native')
      Linking.openURL(managementURL).catch((err: Error) =>
        console.error('[RevenueCat] Failed to open settings:', err),
      )
    }
  } catch (error) {
    console.error('[RevenueCat] Error opening subscription settings:', error)
  }
}

/**
 * Map product ID to plan type
 */
export function productIdToPlan(productId: string): Plan {
  return PRODUCT_ID_TO_PLAN[productId] || 'free'
}

/**
 * Check if user has active Plus subscription
 */
export async function hasActivePlus(): Promise<boolean> {
  const plan = await getActivePlan()
  return plan === 'plus'
}

/**
 * Check if user has active Supporter or Plus subscription
 */
export async function hasActiveSupport(): Promise<boolean> {
  const plan = await getActivePlan()
  return plan === 'supporter' || plan === 'plus'
}
