'use client'

/**
 * 共用 UI 基礎元件 + 圖示集。
 *
 * 目的：全站視覺語言一致，停止每頁各自手刻按鈕/卡片/色彩。
 * 反「AI slop」原則：用真正的線性 SVG 圖示取代 emoji 當作介面圖示；
 * 色彩只用暖色品牌系與語意 tint（不再散用 blue-50 / yellow-50 / green-50）；
 * 圓角刻意分級（sm/md/lg/xl）而非全部同一顆。
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

/* ────────────────────────── 圖示集 ────────────────────────── */

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

/* ────────────────────────── 版面 ────────────────────────── */

/** 一致的頁面外殼：取代各頁手寫的 `bg-gradient-to-b from-bg to-white`。
 *  pb-28 預留底部導覽空間（有導覽的頁面）。 */
export function PageShell({
  children,
  className = '',
  withNav = true,
}: {
  children: ReactNode
  className?: string
  withNav?: boolean
}) {
  return (
    <main
      className={`relative min-h-dvh overflow-hidden px-5 pt-7 ${withNav ? 'pb-28' : 'pb-10'} ${className}`}
    >
      {/* 黏土調性氛圍：兩顆柔和暖色飄移球，給頁面一點溫度與深度（不可互動、可降動態） */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div
          className="clay-blob -left-16 -top-10 h-56 w-56 opacity-40"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-brand) 38%, transparent), transparent 70%)',
          }}
        />
        <div
          className="clay-blob -right-20 top-40 h-52 w-52 opacity-30"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-warning) 30%, transparent), transparent 70%)',
            animationDelay: '-7s',
          }}
        />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[480px] space-y-6">{children}</div>
    </main>
  )
}

/** 一致的頁首：可選返回鍵、標題、副標。 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  align = 'left',
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  backHref?: string
  onBack?: () => void
  align?: 'left' | 'center'
  action?: ReactNode
}) {
  return (
    <header className="space-y-3">
      {(backHref || onBack) &&
        (backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            <Icon name="back" className="h-[16px] w-[16px]" />
            返回
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            <Icon name="back" className="h-[16px] w-[16px]" />
            返回
          </button>
        ))}
      <div
        className={`flex items-end justify-between gap-3 ${align === 'center' ? 'flex-col items-center text-center' : ''}`}
      >
        <div className="space-y-1.5">
          <h1 className="text-[26px] font-bold leading-tight text-text">{title}</h1>
          {subtitle && <p className="text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}

/* ────────────────────────── 容器 ────────────────────────── */

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'form' | 'li'
}) {
  return (
    <Tag className={`rounded-xl border border-border/60 bg-card p-6 shadow-clay ${className}`}>
      {children}
    </Tag>
  )
}

/* ────────────────────────── 按鈕 ────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'lg'

// 黏土鈕扣：較大圓角 + 按壓回彈（squish 到 0.96），手感像可愛的軟糖按鈕。
const BTN_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[image:var(--gradient-brand)] text-white shadow-brand hover:brightness-[1.04]',
  secondary: 'bg-card text-text shadow-clay-sm ring-1 ring-border/70 hover:bg-bg',
  ghost: 'bg-transparent text-brand hover:bg-brand-tint',
  danger: 'bg-danger-tint text-danger hover:brightness-95',
}

const BTN_SIZE: Record<ButtonSize, string> = {
  md: 'px-4 py-2.5 text-sm',
  lg: 'w-full px-5 py-3.5 text-base',
}

export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  type = 'button',
  disabled,
  loading,
  onClick,
  className = '',
  icon,
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
  icon?: IconName
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {loading ? (
        <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
      ) : (
        icon && <Icon name={icon} className="h-[18px] w-[18px]" />
      )}
      {children}
    </button>
  )
}

/** 連結樣式的按鈕（用 next/link 導頁，外觀同 Button）。 */
export function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'lg',
  icon,
  className = '',
}: {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {icon && <Icon name={icon} className="h-[18px] w-[18px]" />}
      {children}
    </Link>
  )
}

/* ────────────────────────── 提示 / 訊息 ────────────────────────── */

type CalloutTone = 'info' | 'tip' | 'success' | 'warning' | 'danger'

const CALLOUT_TONE: Record<CalloutTone, { wrap: string; icon: IconName; iconClass: string }> = {
  info: { wrap: 'bg-info-tint text-info', icon: 'info', iconClass: 'text-info' },
  tip: { wrap: 'bg-brand-tint text-brand-strong', icon: 'lightbulb', iconClass: 'text-brand' },
  success: { wrap: 'bg-success-tint text-success', icon: 'check', iconClass: 'text-success' },
  warning: { wrap: 'bg-warning-tint text-warning', icon: 'alert', iconClass: 'text-warning' },
  danger: { wrap: 'bg-danger-tint text-danger', icon: 'alert', iconClass: 'text-danger' },
}

export function Callout({
  tone = 'tip',
  title,
  children,
  className = '',
}: {
  tone?: CalloutTone
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const t = CALLOUT_TONE[tone]
  return (
    <div className={`flex gap-3 rounded-lg p-4 text-sm ${t.wrap} ${className}`}>
      <Icon name={t.icon} className={`mt-0.5 h-[20px] w-[20px] shrink-0 ${t.iconClass}`} />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed [&_strong]:font-semibold">{children}</div>}
      </div>
    </div>
  )
}

/** 錯誤 live region：常駐 DOM，僅以樣式切換（無障礙友善）。 */
export function ErrorAlert({
  message,
  className = '',
}: {
  message?: string | null
  className?: string
}) {
  return (
    <div
      role="alert"
      className={
        message
          ? `flex items-center gap-2 rounded-lg bg-danger-tint p-3 text-sm text-danger ${className}`
          : 'sr-only'
      }
    >
      {message && <Icon name="alert" className="h-[16px] w-[16px] shrink-0" />}
      {message}
    </div>
  )
}

/* ────────────────────────── 表單 ────────────────────────── */

const FIELD_INPUT =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-text shadow-[inset_0_2px_4px_rgb(74_49_28/0.05)] placeholder:text-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-text">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={`${FIELD_INPUT} ${className}`} {...rest} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select className={`${FIELD_INPUT} ${className}`} {...rest}>
      {children}
    </select>
  )
}
