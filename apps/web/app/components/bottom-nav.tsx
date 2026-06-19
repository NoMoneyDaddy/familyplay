'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from './ui'

/** 不顯示底部導覽的「進入前」頁面（登入、引導、加入家庭、離線、錯誤頁）。 */
const HIDDEN_PREFIXES = [
  '/auth',
  '/onboarding',
  '/join',
  '/offline',
  '/try',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/admin',
]

interface Tab {
  href: string
  label: string
  icon: IconName
  /** 哪些路徑前綴算「在這個分頁」 */
  match: string[]
}

// 設定改放在每頁右上角的齒輪（見 SettingsGearLink），不再佔一個底部分頁。
const TABS: Tab[] = [
  {
    href: '/now',
    label: '今天',
    icon: 'today',
    match: ['/now', '/select', '/recommendations', '/activity'],
  },
  { href: '/history', label: '紀錄', icon: 'history', match: ['/history', '/capabilities'] },
  { href: '/saved', label: '收藏', icon: 'heart', match: ['/saved'] },
  { href: '/children', label: '孩子', icon: 'child', match: ['/children'] },
]

export function BottomNav() {
  const pathname = usePathname() || '/'

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null
  }
  // 首頁（/）導向流程入口，也不顯示
  if (pathname === '/') return null

  return (
    <nav
      aria-label="主導覽"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border/60 bg-card/90 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-10px_rgb(74_49_28/0.16)] backdrop-blur-md"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-brand' : 'text-faint hover:text-muted'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                    active ? 'bg-brand-tint shadow-clay-sm' : 'bg-transparent'
                  }`}
                >
                  <Icon
                    name={tab.icon}
                    className="h-[20px] w-[20px]"
                    strokeWidth={active ? 2 : 1.75}
                  />
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
