'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, Suspense, useState } from 'react'

type AuthMode = 'google' | 'email'
type EmailTab = 'login' | 'signup' | 'reset'

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [authMode, setAuthMode] = useState<AuthMode>('google')
  const [emailTab, setEmailTab] = useState<EmailTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam || '')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (emailTab === 'reset') {
        // Send password reset email
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Password reset failed')
          return
        }

        setSuccess(data.message)
        setEmail('')
      } else {
        // Signup or login
        const response = await fetch('/api/auth/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Authentication failed')
          return
        }

        if (data.requiresVerification) {
          setSuccess(
            "Signup successful! Please check your email to verify your account. If you don't see it, check your spam folder.",
          )
          setEmail('')
          setPassword('')
          setTimeout(() => {
            setEmailTab('login')
          }, 3000)
        } else {
          // Login successful
          router.push('/onboarding')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignin = async () => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
      })

      if (response.status === 307) {
        // Redirect to Google OAuth
        window.location.href = response.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google signin failed')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--color-brand] to-[--color-bg] px-5 py-8">
      <div className="mx-auto max-w-[480px] space-y-8 pt-20">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold text-white">FamilyPlay</h1>
          <p className="text-white/80">30 秒找到今天的陪伴方式</p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-8 shadow-lg">
          <p className="text-center font-semibold text-[--color-text]">選擇登入方式</p>

          {/* live region 常駐 DOM，僅以樣式切換顯示，確保螢幕報讀器可靠播報 */}
          <div
            role="alert"
            className={
              error
                ? 'rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200'
                : 'sr-only'
            }
          >
            {error}
          </div>

          <div
            role="status"
            className={
              success
                ? 'rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200'
                : 'sr-only'
            }
          >
            {success}
          </div>

          {/* Auth Mode Selector */}
          <div
            role="tablist"
            aria-label="登入方式"
            className="flex gap-2 rounded-lg bg-[--color-bg] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'google'}
              onClick={() => {
                setAuthMode('google')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                authMode === 'google' ? 'bg-white text-[--color-brand]' : 'text-[--color-text]'
              }`}
            >
              Google
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'email'}
              onClick={() => {
                setAuthMode('email')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                authMode === 'email' ? 'bg-white text-[--color-brand]' : 'text-[--color-text]'
              }`}
            >
              Email
            </button>
          </div>

          {/* Google Auth */}
          {authMode === 'google' && (
            <form
              role="tabpanel"
              aria-label="Google 登入"
              onSubmit={(e) => {
                e.preventDefault()
                handleGoogleSignin()
              }}
            >
              <button
                type="submit"
                className="w-full rounded-lg border-2 border-[--color-border] py-4 text-center font-semibold text-[--color-text] transition-all hover:border-[--color-brand]"
              >
                <span aria-hidden="true">🔐 </span>用 Google 帳號登入
              </button>
            </form>
          )}

          {/* Email Auth */}
          {authMode === 'email' && (
            <div role="tabpanel" aria-label="Email 登入" className="space-y-4">
              {/* Email Tab Selector */}
              <div
                role="tablist"
                aria-label="Email 登入選項"
                className="flex gap-1 rounded-lg bg-[--color-bg] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={emailTab === 'login'}
                  onClick={() => {
                    setEmailTab('login')
                    setError('')
                    setSuccess('')
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${
                    emailTab === 'login' ? 'bg-white text-[--color-brand]' : 'text-[--color-text]'
                  }`}
                >
                  登入
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={emailTab === 'signup'}
                  onClick={() => {
                    setEmailTab('signup')
                    setError('')
                    setSuccess('')
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${
                    emailTab === 'signup' ? 'bg-white text-[--color-brand]' : 'text-[--color-text]'
                  }`}
                >
                  註冊
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={emailTab === 'reset'}
                  onClick={() => {
                    setEmailTab('reset')
                    setError('')
                    setSuccess('')
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${
                    emailTab === 'reset' ? 'bg-white text-[--color-brand]' : 'text-[--color-text]'
                  }`}
                >
                  重設密碼
                </button>
              </div>

              {/* Email Form */}
              <form
                role="tabpanel"
                aria-label="Email 登入表單"
                onSubmit={handleEmailAuth}
                className="space-y-3"
              >
                <label htmlFor="auth-email" className="sr-only">
                  電子信箱
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="你的 email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[--color-border] px-4 py-2 text-[--color-text] placeholder-[--color-muted] disabled:bg-[--color-bg]"
                />

                {emailTab !== 'reset' && (
                  <div className="relative">
                    <label htmlFor="auth-password" className="sr-only">
                      密碼
                    </label>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={emailTab === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="密碼 (至少 8 個字元)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full rounded-lg border border-[--color-border] px-4 py-2 text-[--color-text] placeholder-[--color-muted] disabled:bg-[--color-bg]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-muted] hover:text-[--color-text]"
                    >
                      {showPassword ? '隱藏' : '顯示'}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[--color-brand] py-3 font-semibold text-white transition-all disabled:opacity-50"
                >
                  {loading
                    ? '處理中...'
                    : emailTab === 'reset'
                      ? '寄送重設連結'
                      : emailTab === 'signup'
                        ? '建立帳號'
                        : '登入'}
                </button>
              </form>

              {emailTab !== 'reset' && (
                <p className="text-center text-xs text-[--color-muted]">首次登入時會自動建立帳號</p>
              )}
            </div>
          )}

          <p className="text-center text-xs text-[--color-muted]">你的資料使用 Supabase 安全保護</p>
        </div>
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
