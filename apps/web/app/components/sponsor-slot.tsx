'use client'

import type { SponsorCard } from '@familyplay/data'
import { useEffect, useState } from 'react'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { getPlanCached, isPaidPlan } from '@/lib/plan-cache'
import { Card } from './ui'

// 贊助小卡位（house ads / 在地親子資源）：
// - 僅對免費／未登入使用者顯示（付費 supporter/plus 隱藏 → 「去廣告」成立）
// - 無啟用中的贊助內容時不顯示（dormant，UX 不受影響）
// - 非干擾式：放瀏覽型頁面（如推薦結果底部），勿放快速決策或親子互動流程
// 外部連結一律 rel="noopener noreferrer nofollow sponsored" target="_blank"。
export function SponsorSlot({
  placement = 'recommendations',
  className,
}: {
  placement?: string
  className?: string
}) {
  const [cards, setCards] = useState<SponsorCard[]>([])

  useEffect(() => {
    let active = true
    getPlanCached().then((plan) => {
      if (!active || isPaidPlan(plan)) return // 付費用戶不顯示贊助內容
      fetchWithTimeout(`/api/sponsors?placement=${encodeURIComponent(placement)}`)
        .then((res) => (res.ok ? res.json() : { cards: [] }))
        .then((data) => {
          if (active) setCards(Array.isArray(data.cards) ? data.cards : [])
        })
        .catch(() => {
          // 贊助內容載入失敗不影響頁面
        })
    })
    return () => {
      active = false
    }
  }, [placement])

  if (cards.length === 0) return null

  return (
    <aside className={className} aria-label="贊助內容">
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id}>
            <Card className="space-y-1.5 bg-card/60">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-medium text-faint">
                  贊助
                </span>
                <h3 className="text-sm font-semibold text-text">{c.title}</h3>
              </div>
              <p className="text-sm text-muted">{c.body}</p>
              {c.ctaUrl && c.ctaText && (
                <a
                  href={c.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="inline-block text-sm font-medium text-brand underline underline-offset-2"
                >
                  {c.ctaText}
                </a>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </aside>
  )
}
