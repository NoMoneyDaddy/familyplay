'use client'

import { useEffect, useState } from 'react'
import { getPlanCached, isPaidPlan } from '@/lib/plan-cache'

// AdSense 的 client/slot 皆為公開值（會出現在頁面 HTML），用 NEXT_PUBLIC_ 前綴合理、非機密。
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * 輕度廣告位：
 * - 僅對免費／未登入使用者顯示（付費 supporter/plus 不顯示）
 * - 未設定 NEXT_PUBLIC_ADSENSE_CLIENT 或無 slot 時不顯示（dormant，UX 不受影響）
 * - 非干擾式：請只放在瀏覽型頁面（如推薦結果底部），勿放在快速決策或親子互動流程
 */
export function AdSlot({ slot, className }: { slot?: string; className?: string }) {
  const adSlot = slot ?? process.env.NEXT_PUBLIC_ADSENSE_SLOT
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!ADSENSE_CLIENT || !adSlot) return // 未設定 → 不顯示

    let active = true
    // 付費用戶（supporter/plus）不顯示廣告；其餘（免費／未登入／取得失敗）顯示
    getPlanCached().then((plan) => {
      if (active && !isPaidPlan(plan)) setShow(true)
    })

    return () => {
      active = false
    }
  }, [adSlot])

  useEffect(() => {
    if (!show) return
    try {
      if (!window.adsbygoogle) window.adsbygoogle = []
      window.adsbygoogle.push({})
    } catch {
      // AdSense 腳本尚未載入或被阻擋時略過
    }
  }, [show])

  if (!show || !ADSENSE_CLIENT || !adSlot) return null

  return (
    <aside className={className} aria-label="贊助廣告">
      {/* 保留最小高度：避免廣告載入後撐開版面造成 CLS（Core Web Vitals）。 */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 250 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
