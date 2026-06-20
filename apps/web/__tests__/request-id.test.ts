import { describe, expect, it } from 'vitest'
import { getRequestId } from '../lib/request-id'

describe('getRequestId', () => {
  it('沿用上游傳入的 x-request-id', () => {
    const req = new Request('http://localhost/x', { headers: { 'x-request-id': 'rid-123' } })
    expect(getRequestId(req)).toBe('rid-123')
  })

  it('缺 header 時新生一個非空 id', () => {
    const a = getRequestId(new Request('http://localhost/x'))
    const b = getRequestId(new Request('http://localhost/x'))
    expect(a).toBeTruthy()
    expect(a).not.toBe(b) // 每次新生不同
  })
})
