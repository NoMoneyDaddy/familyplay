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
import { Mascot } from './mascot'
// 圖示集已抽到 ./ui/icons（降低本檔體積）；在此匯入供內部元件使用、並 re-export 給既有引用點。
import { Icon, type IconName } from './ui/icons'

export { Icon, type IconName } from './ui/icons'

/* ──────────────────────── 活動屬性標籤 ──────────────────────── */

/** 刺激強度 → 中文標籤與色調（安靜 / 適中 / 活潑）。 */
const STIMULATION_META: Record<'low' | 'medium' | 'high', { label: string; dot: string }> = {
  low: { label: '安靜', dot: 'bg-info' },
  medium: { label: '適中', dot: 'bg-warning' },
  high: { label: '活潑', dot: 'bg-brand' },
}

/** 發展領域 → 中文短標籤（對應 companion_activities.developmental_focus）。 */
export const FOCUS_LABEL: Record<string, string> = {
  gross_motor: '大動作',
  fine_motor: '精細動作',
  language: '語言',
  social_cognitive: '社交認知',
  emotional: '情緒',
}

/** 引擎產出的內部評分 reason（如「發展中能力加分」）對家長沒意義，甚至像亂碼。
 *  這裡把「對家長有用」的那一兩條轉成白話，其餘（優先度調整、降分、安全回退）直接丟掉，
 *  讓卡片只留下「為什麼這個適合我的孩子」這種看得懂的話。 */
const REASON_FRIENDLY: Record<string, string> = {
  發展中能力加分: '正好練到他正在發展的能力',
  '孩子之前很喜歡，加分': '他之前玩這個玩得很開心',
}
export function friendlyReasons(reasons: string[] | undefined): string[] {
  if (!Array.isArray(reasons)) return []
  // 去重：多個內部評分可能對應同一句白話，避免列表出現重複（也避免 React 重複 key）
  const mapped = reasons.map((r) => REASON_FRIENDLY[r]).filter((r): r is string => Boolean(r))
  return Array.from(new Set(mapped))
}

/** 活動屬性列：發展領域分類 + 時長 + 刺激強度，做成可快速掃讀的小標籤
 *  （仿競品卡片的資訊密度——分類用品牌色凸顯，時長/強度用中性色輔助）。 */
export function ActivityMeta({
  developmentalFocus,
  minDurationMinutes,
  maxDurationMinutes,
  stimulationLevel,
  className = '',
}: {
  developmentalFocus?: string[]
  minDurationMinutes?: number
  maxDurationMinutes?: number
  stimulationLevel?: 'low' | 'medium' | 'high'
  className?: string
}) {
  const hasDuration =
    typeof minDurationMinutes === 'number' && typeof maxDurationMinutes === 'number'
  const stim = stimulationLevel ? STIMULATION_META[stimulationLevel] : null
  // 最多顯示 2 個領域，避免標籤過多稀釋重點
  const focuses = (developmentalFocus || [])
    .map((f) => FOCUS_LABEL[f])
    .filter(Boolean)
    .slice(0, 2)
  if (!hasDuration && !stim && focuses.length === 0) return null

  const durationText =
    minDurationMinutes === maxDurationMinutes
      ? `${minDurationMinutes} 分鐘`
      : `${minDurationMinutes}–${maxDurationMinutes} 分鐘`

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {focuses.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-strong"
        >
          {label}
        </span>
      ))}
      {hasDuration && (
        <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
          <Icon name="clock" className="h-[13px] w-[13px]" />
          {durationText}
        </span>
      )}
      {stim && (
        <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
          <span className={`h-[7px] w-[7px] rounded-full ${stim.dot}`} aria-hidden="true" />
          {stim.label}
        </span>
      )}
    </div>
  )
}

/* ────────────────────────── 版面 ────────────────────────── */

/** 一致的頁面外殼：取代各頁手寫的 `bg-gradient-to-b from-bg to-white`。
 *  pb-28 預留底部導覽空間（有導覽的頁面）。 */
export function PageShell({
  children,
  className = '',
  withNav = true,
  containerClassName = '',
}: {
  children: ReactNode
  className?: string
  withNav?: boolean
  // 內層置中欄的額外 class：預設手機 app 殼 max-w-[480px]，公開著陸頁可加寬（如 lg:max-w-[940px]）。
  containerClassName?: string
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={`relative min-h-dvh overflow-hidden px-5 pt-4 ${withNav ? 'pb-24' : 'pb-10'} ${className}`}
    >
      {/* 黏土調性氛圍：兩顆柔和暖色飄移球，給頁面一點溫度與深度（不可互動、可降動態） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
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
      <div className={`relative z-10 mx-auto w-full max-w-[480px] space-y-6 ${containerClassName}`}>
        {children}
      </div>
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

/** 空狀態：吉祥物小熊 + 標題 + 說明 + 行動。讓「還沒有資料」也溫暖不冷清。 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-card p-8 text-center shadow-clay">
      <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-brand-tint">
        <Mascot className="h-14 w-14" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-text">{title}</p>
        {children && <p className="text-sm leading-relaxed text-muted">{children}</p>}
      </div>
      {action}
    </div>
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
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

// 底色／陰影等靜態樣式（不含互動回饋）。
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[image:var(--gradient-brand)] text-white shadow-brand',
  secondary: 'bg-card text-text shadow-clay-sm ring-1 ring-border/70',
  ghost: 'bg-transparent text-brand',
  danger: 'bg-danger-tint text-danger',
}

// 互動回饋（hover/active squish）分兩套：
//  • <button>（Button）用 enabled: 前綴——disabled 時不觸發亮度/底色/縮放。
//  • <a>（LinkButton）永遠可互動，用原樣；:enabled 不適用於 <a>，若也加 enabled:
//    反而會讓所有連結 CTA 失去 hover，故刻意分開。
const BTN_FX_BUTTON: Record<ButtonVariant, string> = {
  primary: 'enabled:hover:brightness-[1.04] enabled:active:scale-[0.96]',
  secondary: 'enabled:hover:bg-bg enabled:active:scale-[0.96]',
  ghost: 'enabled:hover:bg-brand-tint enabled:active:scale-[0.96]',
  danger: 'enabled:hover:brightness-95 enabled:active:scale-[0.96]',
}
const BTN_FX_LINK: Record<ButtonVariant, string> = {
  primary: 'hover:brightness-[1.04] active:scale-[0.96]',
  secondary: 'hover:bg-bg active:scale-[0.96]',
  ghost: 'hover:bg-brand-tint active:scale-[0.96]',
  danger: 'hover:brightness-95 active:scale-[0.96]',
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
      className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_FX_BUTTON[variant]} ${BTN_SIZE[size]} ${className}`}
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
      className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_FX_LINK[variant]} ${BTN_SIZE[size]} ${className}`}
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
