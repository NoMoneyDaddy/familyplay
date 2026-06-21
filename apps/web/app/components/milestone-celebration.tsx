'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from './ui'

// 一個慶祝事件：里程碑達成時短暫顯示彩帶 + 慶祝卡，數秒後自動消失。
export interface Celebration {
  id: string
  title: string
  subtitle?: string
}

// 暖色系彩帶顏色（與品牌 token 同調，避免突兀的飽和色）
const COLORS = ['#ff6b35', '#e8551f', '#1b7a4e', '#1d6fa5', '#9a5400']
const PIECE_COUNT = 70

/**
 * 里程碑慶祝特效。傳入 celebration 即觸發；數秒後呼叫 onDone 讓上層取出下一個。
 * 尊重 prefers-reduced-motion：不渲染落下的彩帶，只留慶祝卡（卡的 pop 動畫會被
 * 全站 reduced-motion 規則降為靜態）。不可互動、aria-live 播報給輔助科技。
 */
export function MilestoneCelebration({
  celebration,
  onDone,
}: {
  celebration: Celebration | null
  onDone: () => void
}) {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // 彩帶碎片只在每個 celebration 重算一次（避免每次 render 重排）
  const pieces = useMemo(() => {
    if (!celebration || reduced) return []
    return Array.from({ length: PIECE_COUNT }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.8 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      width: 6 + Math.random() * 8,
    }))
  }, [celebration, reduced])

  useEffect(() => {
    if (!celebration) return
    const timer = setTimeout(onDone, reduced ? 2200 : 3000)
    return () => clearTimeout(timer)
  }, [celebration, reduced, onDone])

  if (!celebration) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 mx-auto max-w-[480px] overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {pieces.map((p, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 短暫彩帶碎片、順序穩定
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.width}px`,
            height: `${p.width * 0.42}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-1/3 flex justify-center px-6">
        <div className="milestone-pop flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-clay ring-2 ring-brand/40">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-brand)] text-white shadow-brand">
            <Icon name="sparkle" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text">{celebration.title}</p>
            {celebration.subtitle && (
              <p className="text-xs leading-snug text-muted">{celebration.subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
