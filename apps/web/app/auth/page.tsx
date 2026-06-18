'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Mascot } from '@/app/components/mascot'
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

function GuestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" fill="currentColor" />
      <path d="M4.5 19.2C4.5 15.6 7.9 13.3 12 13.3s7.5 2.3 7.5 5.9" fill="currentColor" />
    </svg>
  )
}

function Spinner() {
  return (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      aria-hidden="true"
    />
  )
}

function AuthPageInner() {
  const searchParams = useSearchParams()
  const [error, setError] = useState(searchParams.get('error') ? '登入未完成，請再試一次。' : '')
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null)

  // 登入後要回到的內部路徑（例如帶邀請碼的 /join）。只接受純站內路徑，避免 open redirect。
  // 注意：不能只擋 '//'——'/\evil.com' 會被 URL 正規化成 '//evil.com' 導向外站，
  // 因此第二個字元也要排除反斜線。
  const rawNext = searchParams.get('next')
  const next = rawNext && (rawNext === '/' || /^\/[^/\\]/.test(rawNext)) ? rawNext : null

  const handleGoogle = async () => {
    setError('')
    setLoading('google')
    try {
      const supabase = createClient()
      const callback = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback },
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
      // 完整重新載入，確保伺服器讀到新的 session cookie 後正確導流（帶 next 則回原頁）
      window.location.href = next || '/'
    } catch {
      setError('訪客登入暫時無法使用，請改用 Google 登入')
      setLoading(null)
    }
  }

  // 統一的按鈕設計系統：相同尺寸/圓角/字重/結構（圖示 + 文字），各方式僅以底色與圖示區分。
  const btnBase =
    'flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-base font-semibold shadow-clay-sm ring-1 transition-all duration-150 enabled:hover:shadow-md enabled:active:scale-[0.96] disabled:opacity-60'

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10">
      {/* 暖色氛圍背景（多層次製造深度） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-tint via-bg to-bg"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand opacity-20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-16 -z-10 h-64 w-64 rounded-full bg-warning opacity-10 blur-3xl"
      />

      <div className="w-full max-w-[400px] space-y-6">
        {/* 主卡片：黏土質感的入口卡 */}
        <div className="space-y-7 rounded-[30px] bg-card p-7 shadow-clay ring-1 ring-border/50">
          {/* Hero */}
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[26px] bg-[image:var(--gradient-brand)] shadow-brand ring-4 ring-brand-tint">
              <Mascot className="h-12 w-12" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-[28px] font-bold leading-tight text-text">FamilyPlay</h1>
              <p className="text-muted">給疲憊的你，30 秒就有今天的陪伴方案</p>
            </div>
          </div>

          {/* 錯誤 live region（常駐 DOM） */}
          <div
            role="alert"
            className={
              error ? 'rounded-lg bg-danger-tint p-3 text-center text-sm text-danger' : 'sr-only'
            }
          >
            {error}
          </div>

          {/* 登入方式：Google 或 訪客（統一設計系統） */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading !== null}
              aria-busy={loading === 'google'}
              className={`${btnBase} bg-card text-text ring-border`}
            >
              {loading === 'google' ? <Spinner /> : <GoogleIcon />}
              <span>{loading === 'google' ? '正在導向 Google…' : '用 Google 登入'}</span>
            </button>

            <button
              type="button"
              onClick={handleGuest}
              disabled={loading !== null}
              aria-busy={loading === 'guest'}
              className={`${btnBase} bg-brand-tint text-text ring-border`}
            >
              {loading === 'guest' ? (
                <Spinner />
              ) : (
                <span className="text-brand">
                  <GuestIcon />
                </span>
              )}
              <span>{loading === 'guest' ? '正在建立訪客身分…' : '以訪客身分開始'}</span>
            </button>
          </div>

          {/* 信任元素 */}
          <p className="text-center text-xs text-muted">免費開始 · 免信用卡 · 30 秒上手</p>

          {/* 不強制登入：可先免登入試用 */}
          <p className="text-center text-sm text-muted">
            想先看看？{' '}
            <Link href="/try" className="font-medium text-brand hover:underline">
              免登入直接試用
            </Link>
          </p>
        </div>

        {/* 卡片外的安心說明 */}
        <p className="px-2 text-center text-xs leading-relaxed text-muted">
          登入 Google 可在不同裝置同步孩子的紀錄。訪客模式免註冊、資料僅存於此帳號，之後可隨時改用
          Google 登入保存。
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
          <p className="text-muted" role="status">
            載入中...
          </p>
        </main>
      }
    >
      <AuthPageInner />
    </Suspense>
  )
}
