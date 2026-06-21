'use client'

import { useEffect, useState } from 'react'
import { AIKeySettings } from '@/app/components/ai-key-settings'
import { LegalLinks } from '@/app/components/legal-links'
import { ReminderToggle } from '@/app/components/reminder-toggle'
import {
  Button,
  Callout,
  Card,
  ErrorAlert,
  Icon,
  type IconName,
  PageHeader,
  PageShell,
} from '@/app/components/ui'
import { fetchWithTimeout } from '@/lib/fetch-timeout'
import { useGoBack } from '@/lib/use-go-back'

interface UserProfile {
  displayName?: string
  avatarUrl?: string
}

// 本 App 免費、由低干擾廣告支持，不提供付費方案 → 不顯示訂閱入口。
const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/settings/invite', label: '家庭成員', icon: 'family' },
]

export default function SettingsPage() {
  const goBack = useGoBack('/now')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithTimeout('/api/profile')
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // 登出/刪除帳號後用整頁導向（非 client 路由），確保 Zustand store、快取等記憶體狀態被清空
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth'
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (res.ok) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        window.location.href = '/try'
      } else {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || '刪除帳號失敗，請稍後再試')
        setDeleting(false)
      }
    } catch {
      setDeleteError('發生錯誤，請稍後再試')
      setDeleting(false)
    }
  }

  return (
    <PageShell>
      <PageHeader title="設定" onBack={goBack} />

      {loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : (
        <div className="space-y-4">
          {/* 帳號身分卡：頭像圓徽 + 名稱，把「這是誰的帳號」做成一眼可辨的頁首 */}
          <Card className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint ring-1 ring-border/60">
              {user?.avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: 第三方頭像 URL，毋須 next/image 優化
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Icon name="user" className="h-7 w-7 text-brand" />
              )}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-semibold text-text">{user?.displayName || '我的帳號'}</p>
              <p className="text-xs text-muted">FamilyPlay MVP v0.1</p>
            </div>
          </Card>

          <ReminderToggle />

          <AIKeySettings />

          <div className="space-y-2">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4 text-text shadow-clay-sm transition-all hover:bg-bg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand-tint">
                  <Icon name={link.icon} className="h-[19px] w-[19px] text-brand" />
                </span>
                <span className="flex-1 font-medium">{link.label}</span>
                <Icon name="chevronRight" className="h-[18px] w-[18px] text-faint" />
              </a>
            ))}
          </div>

          {/* 登出與導覽列分開：避免把「離開帳號」混進日常設定入口 */}
          <Button variant="danger" icon="logout" onClick={handleLogout}>
            登出
          </Button>

          <Callout tone="tip" title="提示">
            你的資料已加密保存在 Supabase，符合隱私標準。
          </Callout>

          {/* 危險區：刪除帳號（兩步確認） */}
          <div className="pt-2">
            {confirmingDelete ? (
              <Card className="space-y-3 ring-1 ring-danger/30">
                <p className="text-sm text-text">
                  確定要刪除帳號嗎？這會<strong>永久刪除</strong>
                  你的孩子檔案、陪伴紀錄與你建立的家庭資料，<strong>無法復原</strong>。
                </p>
                <ErrorAlert message={deleteError} />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    取消
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    icon="trash"
                    className="flex-1"
                    loading={deleting}
                    onClick={handleDeleteAccount}
                  >
                    確認刪除
                  </Button>
                </div>
              </Card>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mx-auto block text-sm text-faint transition-colors hover:text-danger"
              >
                刪除帳號
              </button>
            )}
          </div>

          <LegalLinks className="pt-2" />
        </div>
      )}
    </PageShell>
  )
}
