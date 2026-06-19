'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/app/components/ui'

// Chrome/Android 的 beforeinstallprompt 不在標準 lib.dom 型別內，最小宣告。
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'fp_install_dismissed_at'
const DISMISS_DAYS = 30

function recentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY))
    if (!ts) return false
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // 隱私模式/停用儲存：忽略，最多本次再顯示
  }
}

// 全傻瓜：引導把 App 加到主畫面，下次一秒打開、可離線。
// 只在瀏覽器真的能安裝（送出 beforeinstallprompt）時才顯示；已安裝/standalone 不擾民。
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 已是獨立視窗（已安裝）就不顯示
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (standalone || recentlyDismissed()) return

    const onPrompt = (e: Event) => {
      e.preventDefault() // 攔下瀏覽器預設小工具列，改用我們自己的時機
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => {
      setVisible(false)
      markDismissed()
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    markDismissed()
  }

  const install = async () => {
    if (!deferred) return
    setVisible(false)
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      // 使用者取消或瀏覽器拒絕：不再追問
    }
    markDismissed()
    setDeferred(null)
  }

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-40 mx-auto max-w-[480px] px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-clay">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <Icon name="sparkle" className="h-[20px] w-[20px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-text">加到主畫面</p>
          <p className="text-xs leading-tight text-muted">下次一秒打開，還能離線用</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-xl bg-[image:var(--gradient-brand)] px-3.5 py-2 text-sm font-semibold text-white shadow-brand active:opacity-90"
        >
          安裝
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="先不要"
          className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-bg"
        >
          <Icon name="x" className="h-[16px] w-[16px]" />
        </button>
      </div>
    </div>
  )
}
