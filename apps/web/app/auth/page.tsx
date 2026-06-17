'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(searchParams.get('error') ? '登入未完成，請再試一次。' : '')
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null)

  const handleGoogle = async () => {
    setError('')
    setLoading('google')
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) {
        setError(authError.message || 'Google 登入失敗，請稍後再試')
        setLoading(null)
      }
      // 成功時瀏覽器會自動跳轉到 Google 授權頁
    } catch {
      setError('Google 登入失敗，請稍後再試')
      setLoading(null)
    }
  }

  const handleGuest = async () => {
    setError('')
    setLoading('guest')
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInAnonymously()
      if (authError) {
        setError('訪客登入暫時無法使用，請改用 Google 登入')
        setLoading(null)
        return
      }
      // 完整重新載入，確保伺服器讀到新的 session cookie 後正確導流
      window.location.href = '/'
    } catch {
      setError('訪客登入暫時無法使用，請改用 Google 登入')
      setLoading(null)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* 暖色氛圍背景 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[--color-brand-tint] via-[--color-bg] to-[--color-bg]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[--color-brand] opacity-15 blur-3xl"
      />

      <div className="w-full max-w-[380px] space-y-10">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[--color-brand] text-3xl shadow-lg">
            <span aria-hidden="true">🧸</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold text-[--color-text]">FamilyPlay</h1>
            <p className="text-[--color-muted]">給疲憊的你，30 秒就有今天的陪伴方案</p>
          </div>
        </div>

        {/* 錯誤 live region（常駐 DOM） */}
        <div
          role="alert"
          className={
            error ? 'rounded-xl bg-red-50 p-3 text-center text-sm text-red-700' : 'sr-only'
          }
        >
          {error}
        </div>

        {/* 登入方式：Google 或 訪客 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[--color-card] py-4 font-semibold text-[--color-text] shadow-sm ring-1 ring-[--color-border] transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {loading === 'google' ? (
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-[--color-muted] border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <GoogleIcon />
            )}
            <span>用 Google 登入</span>
          </button>

          <button
            type="button"
            onClick={handleGuest}
            disabled={loading !== null}
            className="w-full rounded-2xl py-3.5 font-medium text-[--color-muted] transition-colors hover:text-[--color-text] disabled:opacity-60"
          >
            {loading === 'guest' ? '建立訪客身分…' : '先以訪客身分開始'}
          </button>
        </div>

        {/* 安心說明 */}
        <p className="text-center text-xs leading-relaxed text-[--color-muted]">
          登入 Google 可在不同裝置同步孩子的紀錄。
          <br />
          訪客模式免註冊、資料僅存於此帳號，之後可隨時改用 Google 登入保存。
        </p>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-[--color-muted]" role="status">
            載入中...
          </p>
        </main>
      }
    >
      <AuthPageInner />
    </Suspense>
  )
}
