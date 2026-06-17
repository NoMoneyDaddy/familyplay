'use client'

import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { useEffect, useState } from 'react'

export function AuthButton() {
  const configured = isSupabaseConfigured()
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!configured) {
      setReady(true)
      return
    }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [configured])

  // 尚未設定 Supabase 或還在載入時不顯示，避免閃爍與錯誤
  if (!configured || !ready) return null

  const signIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (email) {
    return (
      <form action="/auth/signout" method="post" className="flex items-center gap-2">
        <span className="max-w-[140px] truncate text-xs text-[--color-muted]">{email}</span>
        <button type="submit" className="text-xs text-[--color-brand] underline">
          登出
        </button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={signIn}
      className="rounded-lg border border-[--color-border] bg-white px-3 py-1.5 text-sm font-medium text-[--color-text]"
    >
      用 Google 登入
    </button>
  )
}
