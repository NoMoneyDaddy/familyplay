'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  displayName?: string
  avatarUrl?: string
}

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
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">設定</h1>
        </div>

        {loading ? (
          <div className="text-center text-[--color-muted]">加載中...</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-[--color-text]">帳號</h3>
              {user?.displayName && <p className="text-[--color-text]">👤 {user.displayName}</p>}
              <p className="mt-2 text-xs text-[--color-muted]">FamilyPlay MVP v0.1</p>
            </div>

            <div className="space-y-2">
              <a
                href="/account/entitlements"
                className="block rounded-lg bg-white p-4 text-[--color-text] shadow-sm hover:bg-[--color-bg]"
              >
                💳 Subscription
              </a>
              <a
                href="/settings/invite"
                className="block rounded-lg bg-white p-4 text-[--color-text] shadow-sm hover:bg-[--color-bg]"
              >
                👨‍👩‍👧 家庭成員
              </a>
              <a
                href="/history"
                className="block rounded-lg bg-white p-4 text-[--color-text] shadow-sm hover:bg-[--color-bg]"
              >
                📊 陪伴紀錄
              </a>
              <button
                onClick={handleLogout}
                className="w-full rounded-lg bg-red-100 p-4 text-red-600 transition-colors hover:bg-red-200"
              >
                🚪 登出
              </button>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-semibold">💡 提示</p>
              <p className="mt-1 text-xs">你的資料已加密保存在 Supabase，符合隱私標準。</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
