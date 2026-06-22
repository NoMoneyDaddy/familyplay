import type { ReactNode } from 'react'
import { FOCUS_LABEL } from './ui'

// 每個發展領域配一張「通用插畫」motif（自帶 SVG，零外部資產、零載入成本），
// 用色與品牌黏土調性一致，做成卡片縮圖，提升掃讀性與「被分類」的可愛感。
// viewBox 一律 0 0 24 24，便於沿用熟悉的圖示座標。
interface FocusArt {
  bg: string // 底色（領域 tint）
  fg: string // 圖案色（領域強色）
  art: ReactNode
}

const FOCUS_ART: Record<string, FocusArt> = {
  // 大動作：彈跳的球 + 拋物線軌跡
  gross_motor: {
    bg: 'bg-brand-tint',
    fg: 'text-brand',
    art: (
      <>
        <path
          d="M5 15 Q12 4 19 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 2.5"
          opacity="0.5"
        />
        <circle cx="12" cy="16" r="5" fill="currentColor" />
        <circle cx="10.3" cy="14.3" r="1.5" fill="#fff" opacity="0.5" />
      </>
    ),
  },
  // 精細動作：堆疊的積木
  fine_motor: {
    bg: 'bg-warning-tint',
    fg: 'text-warning',
    art: (
      <>
        <rect x="5" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
        <rect x="12" y="10.5" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.65" />
        <rect x="8" y="5" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.45" />
      </>
    ),
  },
  // 語言：對話泡泡 + 三個點
  language: {
    bg: 'bg-info-tint',
    fg: 'text-info',
    art: (
      <>
        <rect x="4" y="5" width="16" height="11" rx="3.5" fill="currentColor" />
        <path d="M8 15 v4 l5 -4 z" fill="currentColor" />
        <g fill="#fff">
          <circle cx="9" cy="10.5" r="1.1" />
          <circle cx="12" cy="10.5" r="1.1" />
          <circle cx="15" cy="10.5" r="1.1" />
        </g>
      </>
    ),
  },
  // 社交認知：兩個交疊的圓（連結 / 互動）
  social_cognitive: {
    bg: 'bg-success-tint',
    fg: 'text-success',
    art: (
      <>
        <circle cx="9.5" cy="12" r="5.5" fill="currentColor" opacity="0.55" />
        <circle cx="14.5" cy="12" r="5.5" fill="currentColor" opacity="0.55" />
      </>
    ),
  },
  // 情緒：愛心
  emotional: {
    bg: 'bg-danger-tint',
    fg: 'text-danger',
    art: (
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        fill="currentColor"
      />
    ),
  },
}

// 無領域資料時的通用 fallback：品牌色火花
const FALLBACK_ART: FocusArt = {
  bg: 'bg-brand-tint',
  fg: 'text-brand',
  art: <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z" fill="currentColor" />,
}

/** 領域插畫縮圖：52px 黏土圓角磚 + motif，可選右下角排名徽章。
 *  尺寸用顯式 px，避免受 --spacing 放大。 */
export function FocusIllustration({
  focus,
  rank,
  isTop = false,
  className = '',
}: {
  focus?: string
  rank?: number
  isTop?: boolean
  className?: string
}) {
  const meta = (focus && FOCUS_ART[focus]) || FALLBACK_ART
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-clay-sm ${meta.bg} ${meta.fg}`}
      >
        <svg className="h-[30px] w-[30px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {meta.art}
        </svg>
      </div>
      {typeof rank === 'number' && (
        <span
          className={`absolute -bottom-1.5 -right-1.5 flex h-[20px] w-[20px] items-center justify-center rounded-full border-2 border-card font-display text-[11px] font-bold ${
            isTop
              ? 'bg-[image:var(--gradient-brand)] text-white shadow-brand'
              : 'bg-card text-brand shadow-clay-sm'
          }`}
        >
          {rank}
        </span>
      )}
    </div>
  )
}

/** 領域徽章：把領域 motif（小圖示）＋中文標籤綁成一個膠囊，用領域 tint 上色。
 *  取代「孤零零的縮圖」——家長一看就懂這活動在練哪個發展領域。
 *  焦點不明時退回品牌火花＋通用「陪玩」標籤。 */
export function FocusBadge({ focus, className = '' }: { focus?: string; className?: string }) {
  const meta = (focus && FOCUS_ART[focus]) || FALLBACK_ART
  const label = (focus && FOCUS_LABEL[focus]) || '陪玩'
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full py-1 pr-3 pl-1.5 text-xs font-bold ${meta.bg} ${meta.fg} ${className}`}
    >
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-lg bg-card">
        <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {meta.art}
        </svg>
      </span>
      {label}
    </span>
  )
}
