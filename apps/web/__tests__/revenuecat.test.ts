import { describe, expect, it } from 'vitest'
import {
  classifyEvent,
  type PlanConfig,
  planFromEvent,
  type RevenueCatEvent,
  resolveExpiry,
  verifyRevenueCatAuth,
} from '../lib/payment/revenuecat'

const config: PlanConfig = {
  supporterEntitlement: 'supporter',
  plusEntitlement: 'plus',
  supporterProductIds: ['fp_supporter_monthly'],
  plusProductIds: ['fp_plus_monthly'],
}

const baseEvent: RevenueCatEvent = { type: 'INITIAL_PURCHASE', id: 'evt_1' }

describe('classifyEvent', () => {
  it('activates on purchase/renewal events', () => {
    for (const t of [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'PRODUCT_CHANGE',
      'UNCANCELLATION',
      'NON_RENEWING_PURCHASE',
    ]) {
      expect(classifyEvent(t)).toBe('activate')
    }
  })
  it('deactivates only on EXPIRATION', () => {
    expect(classifyEvent('EXPIRATION')).toBe('deactivate')
  })
  it('ignores CANCELLATION (auto-renew off, still active until expiry) and unknowns', () => {
    expect(classifyEvent('CANCELLATION')).toBe('ignore')
    expect(classifyEvent('BILLING_ISSUE')).toBe('ignore')
    expect(classifyEvent('SOMETHING_NEW')).toBe('ignore')
  })
})

describe('planFromEvent', () => {
  it('maps by entitlement id', () => {
    expect(planFromEvent({ ...baseEvent, entitlement_ids: ['plus'] }, config)).toBe('plus')
    expect(planFromEvent({ ...baseEvent, entitlement_ids: ['supporter'] }, config)).toBe(
      'supporter',
    )
  })
  it('gives plus precedence when both entitlements present', () => {
    expect(planFromEvent({ ...baseEvent, entitlement_ids: ['supporter', 'plus'] }, config)).toBe(
      'plus',
    )
  })
  it('falls back to product_id mapping', () => {
    expect(planFromEvent({ ...baseEvent, product_id: 'fp_plus_monthly' }, config)).toBe('plus')
    expect(planFromEvent({ ...baseEvent, product_id: 'fp_supporter_monthly' }, config)).toBe(
      'supporter',
    )
  })
  it('returns null for unknown product/entitlement', () => {
    expect(planFromEvent({ ...baseEvent, product_id: 'mystery' }, config)).toBeNull()
    expect(planFromEvent(baseEvent, config)).toBeNull()
  })
})

describe('verifyRevenueCatAuth', () => {
  it('accepts an exact match', () => {
    expect(verifyRevenueCatAuth('secret-token', 'secret-token')).toBe(true)
  })
  it('rejects mismatch, length diff, and empty', () => {
    expect(verifyRevenueCatAuth('wrong', 'secret-token')).toBe(false)
    expect(verifyRevenueCatAuth('', 'secret-token')).toBe(false)
    expect(verifyRevenueCatAuth(null, 'secret-token')).toBe(false)
    expect(verifyRevenueCatAuth('secret-token', '')).toBe(false)
  })
})

describe('resolveExpiry', () => {
  it('uses the provided ms epoch', () => {
    const ms = Date.UTC(2027, 0, 1)
    expect(resolveExpiry(ms).toISOString()).toBe(new Date(ms).toISOString())
  })
  it('falls back ~30d for null / NaN', () => {
    const future = Date.now() + 29 * 24 * 60 * 60 * 1000
    expect(resolveExpiry(null).getTime()).toBeGreaterThan(future)
    expect(resolveExpiry(Number.NaN).getTime()).toBeGreaterThan(future)
  })
})
