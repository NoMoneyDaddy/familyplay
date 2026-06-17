'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  Icon,
  type IconName,
  PageHeader,
  PageShell,
} from '@/app/components/ui'

interface UserProfile {
  displayName?: string
  avatarUrl?: string
}

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/account/entitlements', label: 'Subscription', icon: 'card' },
  { href: '/settings/invite', label: '家庭成員', icon: 'family' },
  { href: '/history', label: '陪伴紀錄', icon: 'chart' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  return (
    <PageShell>
      <PageHeader title="設定" />

      {loading ? (
        <div className="text-center text-muted" role="status">
          加載中...
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 font-semibold text-text">帳號</h3>
            {user?.displayName && (
              <p className="flex items-center gap-2 text-text">
                <Icon name="user" className="h-[20px] w-[20px] text-brand" />
                {user.displayName}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">FamilyPlay MVP v0.1</p>
          </Card>

          <div className="space-y-2">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-text shadow-sm transition-colors hover:bg-bg"
              >
                <Icon name={link.icon} className="h-[20px] w-[20px] text-brand" />
                <span className="flex-1 font-medium">{link.label}</span>
                <Icon name="chevronRight" className="h-[18px] w-[18px] text-faint" />
              </a>
            ))}

            <Button variant="danger" icon="logout" onClick={handleLogout}>
              登出
            </Button>
          </div>

          <Callout tone="tip" title="提示">
            你的資料已加密保存在 Supabase，符合隱私標準。
          </Callout>
        </div>
      )}
    </PageShell>
  )
}
