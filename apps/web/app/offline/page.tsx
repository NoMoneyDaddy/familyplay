import Link from 'next/link'
import { Mascot } from '@/app/components/mascot'
import { Icon } from '@/app/components/ui'

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* 黏土調性氛圍球：給離線這種「卡住」的時刻一點溫度，不至於冷清 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="clay-blob left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 opacity-40"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-brand) 32%, transparent), transparent 70%)',
          }}
        />
      </div>

      <span className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-brand-tint shadow-clay">
        <Mascot className="h-16 w-16" />
        {/* 連線狀態小標：暖色系裡用 muted 圓點明確指示「目前斷線」 */}
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-clay-sm">
          <Icon name="cloudBolt" className="h-[15px] w-[15px] text-muted" />
        </span>
      </span>

      <h1 className="mt-5 text-xl font-bold text-text">先休息一下，網路斷線了</h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">
        連線恢復後就能繼續。你已經看過的頁面仍可離線瀏覽。
      </p>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-card px-5 py-3 text-sm font-semibold text-text shadow-clay-sm ring-1 ring-border/70 transition-all duration-150 hover:bg-bg active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <Icon name="refresh" className="h-[16px] w-[16px] text-brand" />
        重新連線
      </Link>
    </main>
  )
}
