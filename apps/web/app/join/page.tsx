'use client'

import { Suspense } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function JoinPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [code, setCode] = useState(codeFromUrl || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleAcceptInvite = async (inviteCode: string) => {
    if (!inviteCode.trim()) {
      setError('請輸入邀請碼')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/households/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setError(null)
        // Redirect to select page after 2 seconds
        setTimeout(() => {
          router.push('/select')
        }, 2000)
      } else {
        setError(data.error || '無法接受邀請。請檢查碼是否正確且尚未過期。')
      }
    } catch (err) {
      console.error('Failed to accept invite:', err)
      setError('發生錯誤。請稍後重試。')
    } finally {
      setLoading(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only auto-accept on initial load when code is provided
  useEffect(() => {
    // If code provided in URL, try to accept it automatically
    if (codeFromUrl && !code) {
      handleAcceptInvite(codeFromUrl)
    }
  }, [codeFromUrl])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-bg] to-white px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[--color-brand]">加入家庭</h1>
          <p className="text-sm text-[--color-muted]">使用邀請碼加入家庭陪伴計畫</p>
        </div>

        {success ? (
          // Success State
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 text-center">
            <div className="text-4xl">✅</div>
            <div>
              <h2 className="font-semibold text-[--color-text]">邀請已接受</h2>
              <p className="mt-2 text-sm text-[--color-muted]">歡迎加入家庭！正在重新導向...</p>
            </div>
          </div>
        ) : (
          // Input State
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[--color-text]">
                邀請碼 (6 個字母)
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="例如: ABC123"
                maxLength={6}
                className="w-full rounded-lg border border-[--color-border] px-4 py-3 text-lg font-mono text-center text-[--color-text] placeholder-[--color-muted] focus:outline-none focus:ring-2 focus:ring-[--color-brand]"
                disabled={loading}
              />
            </label>

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <button
              type="button"
              onClick={() => handleAcceptInvite(code)}
              disabled={loading || !code.trim()}
              className="w-full rounded-lg bg-[--color-brand] px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '驗證中...' : '接受邀請'}
            </button>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-semibold">💡 提示</p>
              <p className="mt-1 text-xs">
                邀請碼由家庭擁有者或照顧者生成。如果還沒有收到邀請碼，請聯繫你的家庭成員。
              </p>
            </div>
          </div>
        )}

        {/* Alternative: Go Back */}
        {!success && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/select')}
              className="text-sm text-[--color-muted] hover:text-[--color-text]"
            >
              返回選擇頁面
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-[--color-muted]">載入中...</p>
        </main>
      }
    >
      <JoinPageInner />
    </Suspense>
  )
}
