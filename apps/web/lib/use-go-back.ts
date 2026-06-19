'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * 統一的「返回」行為：站內有上一頁就 router.back()，否則導向 fallback。
 *
 * 用 Next.js App Router 寫在 history.state 的 idx 判斷「站內是否有上一頁」：
 * idx > 0 代表是站內導覽進來的，back() 安全；idx 為 0／不存在代表直接開連結
 * （外部連結、重新整理、書籤），此時 back() 可能跳出網站，改導向 fallback。
 */
export function useGoBack(fallback = '/now') {
  const router = useRouter()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) router.back()
    else router.push(fallback)
  }, [router, fallback])
}
