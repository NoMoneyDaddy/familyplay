import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout, isAbortError } from '../lib/fetch-timeout'

// fetchWithTimeout signal 合併行為（白皮書 D1）：外部 signal（「換一批」取消）
// 與內建逾時 signal 任一觸發即 abort，且互不覆蓋。

// 以一個「永不自然 resolve、只在 signal abort 時 reject」的假 fetch 觀察 signal 行為
function stubFetch() {
  const fn = vi.fn((_input: unknown, init: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init.signal
      if (signal?.aborted) {
        reject(new DOMException('aborted', 'AbortError'))
        return
      }
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchWithTimeout signal 合併', () => {
  it('外部 signal abort → 整個請求被 abort', async () => {
    stubFetch()
    const ext = new AbortController()
    const p = fetchWithTimeout('/x', { signal: ext.signal }, 99999)
    ext.abort()
    await expect(p).rejects.toSatisfy(isAbortError)
  })

  it('外部 signal 事先 abort → 立即 abort', async () => {
    stubFetch()
    const ext = new AbortController()
    ext.abort()
    await expect(fetchWithTimeout('/x', { signal: ext.signal }, 99999)).rejects.toSatisfy(
      isAbortError,
    )
  })

  it('逾時 signal 仍生效（即使帶了外部 signal）', async () => {
    vi.useFakeTimers()
    stubFetch()
    const ext = new AbortController()
    const p = fetchWithTimeout('/x', { signal: ext.signal }, 50)
    const assertion = expect(p).rejects.toSatisfy(isAbortError)
    await vi.advanceTimersByTimeAsync(60)
    await assertion
  })

  it('無外部 signal 時逾時照常 abort', async () => {
    vi.useFakeTimers()
    stubFetch()
    const p = fetchWithTimeout('/x', {}, 50)
    const assertion = expect(p).rejects.toSatisfy(isAbortError)
    await vi.advanceTimersByTimeAsync(60)
    await assertion
  })
})
