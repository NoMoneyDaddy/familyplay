import Link from 'next/link'

// 法律頁連結：放在登入、設定、方案等頁尾。App Store / Google Play / AdSense / 個資法
// 都要求隱私政策與條款可被觸及。
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="法律資訊"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-faint ${className}`}
    >
      <Link href="/privacy" className="transition-colors hover:text-muted">
        隱私權政策
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms" className="transition-colors hover:text-muted">
        服務條款
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/disclaimer" className="transition-colors hover:text-muted">
        免責聲明
      </Link>
    </nav>
  )
}
