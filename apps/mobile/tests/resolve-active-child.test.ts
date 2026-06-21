import { describe, expect, it } from 'vitest'
import { resolveActiveChild } from '../lib/resolve-active-child'

const kids = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('resolveActiveChild', () => {
  it('空清單回 null', () => {
    expect(resolveActiveChild([], 'a')).toBeNull()
    expect(resolveActiveChild([], null)).toBeNull()
  })

  it('選定 id 存在 → 用它', () => {
    expect(resolveActiveChild(kids, 'b')?.id).toBe('b')
  })

  it('未選定（null）→ 退回第一個', () => {
    expect(resolveActiveChild(kids, null)?.id).toBe('a')
    expect(resolveActiveChild(kids, undefined)?.id).toBe('a')
  })

  it('失效 id（孩子被刪/換裝置）→ 退回第一個', () => {
    expect(resolveActiveChild(kids, 'zzz')?.id).toBe('a')
  })
})
