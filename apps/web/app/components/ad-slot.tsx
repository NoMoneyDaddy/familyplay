'use client'

import { useEffect, useState } from 'react'

// AdSense 的 client/slot 皆為公開值（會出現在頁面 HTML），用 NEXT_PUBLIC_ 前綴合理、非機密。
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

// 模組層級快取：多個 AdSlot 或頁面切換時共用同一次 entitlements 請求，避免重複網路請求。
let planPromise: Promise<string> | null = null
function getPlanCached(): Promise<string> {
  if (!planPromise) {
    planPromise = fetch('/api/account/entitlements')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('entitlements failed'))))
      .then((d) => (d?.plan as string) ?? 'free')
      .catch(() => {
        // 暫時失敗不長存：清掉快取讓下次重試，否則一次網路抖動會把整個 session 鎖成 free。
        planPromise = null
        return 'free'
      })
  }
  return planPromise
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
      if (active && plan !== 'supporter' && plan !== 'plus') setShow(true)
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
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
