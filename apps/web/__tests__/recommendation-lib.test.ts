import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isRealActivity,
  type Recommendation,
  readCachedRec,
  saveCachedRec,
  timeDefaultContext,
} from '../lib/recommendation'

// now/try/recommendations 共用的純 helper（白皮書 God File 收斂）。

describe('isRealActivity', () => {
  it('UUID → true；合成回退 id → false', () => {
    expect(isRealActivity('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isRealActivity('fallback-quiet-time')).toBe(false)
    expect(isRealActivity('')).toBe(false)
  })
})

describe('timeDefaultContext', () => {
  afterEach(() => vi.useRealTimers())

  it('19:00–04:59 → bedtime，其餘 → normal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 20, 21, 0, 0))
    expect(timeDefaultContext()).toBe('bedtime')
    vi.setSystemTime(new Date(2026, 5, 20, 3, 0, 0))
    expect(timeDefaultContext()).toBe('bedtime')
    vi.setSystemTime(new Date(2026, 5, 20, 10, 0, 0))
    expect(timeDefaultContext()).toBe('normal')
    vi.setSystemTime(new Date(2026, 5, 20, 18, 59, 0))
    expect(timeDefaultContext()).toBe('normal')
  })
})

describe('離線快取 round-trip', () => {
  const rec: Recommendation = { id: 'c1', title: '積木', reasons: ['好玩'] }

  // node 環境無 localStorage：用 Map 後備的最小化 stub。
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('save → read 取回同一筆；不同孩子互不干擾', () => {
    saveCachedRec('child-1', rec)
    expect(readCachedRec('child-1')).toEqual(rec)
    expect(readCachedRec('child-2')).toBeNull()
  })

  it('無快取 → null', () => {
    expect(readCachedRec('nobody')).toBeNull()
  })

  it('殘缺/舊結構快取（缺 reasons）→ null，不回殘缺物件', () => {
    localStorage.setItem('fp_now_rec_child-x', JSON.stringify({ id: 'c1', title: '積木' }))
    expect(readCachedRec('child-x')).toBeNull()
  })

  it('localStorage throw（隱私模式）→ save 不爆、read 回 null', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => saveCachedRec('c', rec)).not.toThrow()
    expect(readCachedRec('c')).toBeNull()
  })
})
