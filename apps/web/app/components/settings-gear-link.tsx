import Link from 'next/link'
import { Icon } from './ui'

// 各頁面右上角的設定入口（取代藏在底部分頁的設定）。
export function SettingsGearLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/settings"
      aria-label="設定"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-card hover:text-brand ${className}`}
    >
      <Icon name="settings" className="h-[22px] w-[22px]" />
    </Link>
  )
}
