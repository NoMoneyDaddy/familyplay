'use client'

/**
 * 線性 SVG 圖示集（自 ui.tsx 抽出，降低該 God file 體積與並行衝突）。
 * 反「AI slop」原則：用真正的線性 SVG 圖示取代 emoji 當作介面圖示。
 */

import type { ReactNode } from 'react'

const ICON_PATHS: Record<string, ReactNode> = {
  back: <path d="M15 19l-7-7 7-7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  home: (
    <>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" />
    </>
  ),
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5" />
      <path d="M3 4v3.5H6.5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M5.5 21c0-3.8 2.9-6.5 6.5-6.5s6.5 2.7 6.5 6.5" />
    </>
  ),
  family: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16" cy="8" r="2.6" />
      <path d="M3.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" />
      <path d="M12.5 20c0-3 2-5 4-5s4 2 4 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
      <path d="M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 007.5.5l3-3A5 5 0 0013.5 3.5l-1.7 1.7" />
      <path d="M14 11a5 5 0 00-7.5-.5l-3 3A5 5 0 0010.5 20.5l1.7-1.7" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 11-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 4-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5M12 8h.01" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 00-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0012 3z" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="11" width="15" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.6L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.6a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v16H6.5A2.5 2.5 0 004 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 016.5 18H20" />
    </>
  ),
  star: <path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19l1-5.8L3.6 9.1l5.8-.8z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  moon: <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.6 6.6 0 109.8 9.8z" />,
  cloudBolt: (
    <>
      <path d="M7 16.5a4 4 0 01.5-8 5.5 5.5 0 0110.5 1.6A3.4 3.4 0 0117 16.5" />
      <path d="M12 12.5l-2 3.5h3l-2 3.5" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14 14.8V5a2 2 0 10-4 0v9.8a4 4 0 104 0z" />
      <path d="M12 9.5v5" />
    </>
  ),
  batteryEmpty: (
    <>
      <rect x="2.5" y="8" width="16.5" height="9" rx="2.5" />
      <path d="M21.5 11.5v3" />
    </>
  ),
  batteryLow: (
    <>
      <rect x="2.5" y="8" width="16.5" height="9" rx="2.5" />
      <path d="M21.5 11.5v3" />
      <rect x="5" y="10.3" width="3" height="4.4" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  batteryMid: (
    <>
      <rect x="2.5" y="8" width="16.5" height="9" rx="2.5" />
      <path d="M21.5 11.5v3" />
      <rect x="5" y="10.3" width="3" height="4.4" rx="1" fill="currentColor" stroke="none" />
      <rect x="9.2" y="10.3" width="3" height="4.4" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  batteryFull: (
    <>
      <rect x="2.5" y="8" width="16.5" height="9" rx="2.5" />
      <path d="M21.5 11.5v3" />
      <rect x="5" y="10.3" width="3" height="4.4" rx="1" fill="currentColor" stroke="none" />
      <rect x="9.2" y="10.3" width="3" height="4.4" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.4" y="10.3" width="3" height="4.4" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  faceHappy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.3 14a4.2 4.2 0 007.4 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  faceNeutral: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5h7" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  faceSad: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.3 15.5a4.2 4.2 0 017.4 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.3A3.8 3.8 0 0112 8a3.8 3.8 0 017 2.7c0 4.9-7 9.3-7 9.3z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
}

export type IconName = keyof typeof ICON_PATHS

export function Icon({
  name,
  className = 'h-[20px] w-[20px]',
  strokeWidth = 1.75,
}: {
  name: IconName
  className?: string
  strokeWidth?: number
}) {
  // 預設 20px；圖示尺寸一律用顯式 px，避免受 --spacing:8px 放大影響
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}
