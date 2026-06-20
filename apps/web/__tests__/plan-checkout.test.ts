import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 付費結帳就緒邏輯（白皮書 C1 準備）：守住金流——Plus 須「web key 已設 + 顯式開關」才開放，
// 否則一律「即將推出」，避免在 RevenueCat 未就緒前誤開收費。

const h = vi.hoisted(() => ({ webAvailable: true }))
vi.mock('@/lib/payment/revenuecat-web', () => ({
  isWebPurchasesAvailable: () => h.webAvailable,
}))

import { checkoutReadyFor, plusCheckoutEnabled } from '../lib/plan-checkout'

beforeEach(() => {
  h.webAvailable = true
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('plusCheckoutEnabled', () => {
  it("只有 NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED === 'true' 才開", () => {
    vi.stubEnv('NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED', 'true')
    expect(plusCheckoutEnabled()).toBe(true)
    vi.stubEnv('NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED', '1')
    expect(plusCheckoutEnabled()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED', '')
    expect(plusCheckoutEnabled()).toBe(false)
  })
})

describe('checkoutReadyFor', () => {
  it('web key 未設 → 兩種方案都未就緒', () => {
    h.webAvailable = false
    vi.stubEnv('NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED', 'true')
    expect(checkoutReadyFor('supporter')).toBe(false)
    expect(checkoutReadyFor('plus')).toBe(false)
  })

  it('web key 已設：supporter 就緒、plus 仍需開關', () => {
    vi.stubEnv('NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED', '')
    expect(checkoutReadyFor('supporter')).toBe(true)
    expect(checkoutReadyFor('plus')).toBe(false)
  })

  it('web key 已設 + Plus 開關開 → plus 就緒', () => {
    vi.stubEnv('NEXT_PUBLIC_PLUS_CHECKOUT_ENABLED', 'true')
    expect(checkoutReadyFor('plus')).toBe(true)
  })
})
