'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  ErrorAlert,
  Field,
  PageHeader,
  PageShell,
  TextInput,
} from '@/app/components/ui'

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

      // 未登入：先帶著邀請碼去登入，登入後自動回到本頁接受（避免死路）
      if (res.status === 401) {
        const next = `/join?code=${encodeURIComponent(inviteCode.trim().toUpperCase())}`
        router.push(`/auth?next=${encodeURIComponent(next)}`)
        return
      }

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only auto-accept once on initial load when code is in URL
  useEffect(() => {
    // 連結帶 code 時自動嘗試接受（未登入會被導去登入再自動回來）
    if (codeFromUrl) {
      handleAcceptInvite(codeFromUrl)
    }
  }, [codeFromUrl])

  return (
    <PageShell withNav={false}>
      <PageHeader title="加入家庭" subtitle="使用邀請碼加入家庭陪伴計畫" align="center" />

      {success ? (
        // Success State
        <Callout tone="success" title="邀請已接受">
          歡迎加入家庭！正在重新導向...
        </Callout>
      ) : (
        // Input State
        <Card className="space-y-4">
          <Field label="邀請碼（8 碼英數）" htmlFor="code">
            <TextInput
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="例如：A1B2C3D4"
              maxLength={8}
              className="text-center font-mono text-lg tracking-widest"
              disabled={loading}
            />
          </Field>

          <ErrorAlert message={error} />

          <Button
            size="lg"
            loading={loading}
            disabled={loading || !code.trim()}
            onClick={() => handleAcceptInvite(code)}
          >
            接受邀請
          </Button>

          <Callout tone="tip" title="提示">
            邀請碼由家庭擁有者或照顧者生成。如果還沒有收到邀請碼，請聯繫你的家庭成員。
          </Callout>
        </Card>
      )}

      {/* Alternative: Go Back */}
      {!success && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/select')}
            className="text-sm text-muted transition-colors hover:text-text"
          >
            返回選擇頁面
          </button>
        </div>
      )}
    </PageShell>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-muted">載入中...</p>
        </main>
      }
    >
      <JoinPageInner />
    </Suspense>
  )
}
