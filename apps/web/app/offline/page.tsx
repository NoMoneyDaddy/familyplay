import { Mascot } from '@/app/components/mascot'

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-brand-tint shadow-clay">
        <Mascot className="h-16 w-16" />
      </span>
      <h1 className="text-xl font-bold text-text">目前離線</h1>
      <p className="text-sm text-muted">網路連線中斷了。請檢查連線後重試，已快取的頁面仍可瀏覽。</p>
    </main>
  )
}
