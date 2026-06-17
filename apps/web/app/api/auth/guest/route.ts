import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 訪客登入：建立 Supabase 匿名 session。
 * 注意：需在 Supabase 後台啟用 Anonymous sign-ins（Authentication → Providers）。
 */
export async function POST() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })

  const { error } = await supabase.auth.signInAnonymously()

  if (error) {
    return NextResponse.json(
      { error: error.message || '訪客登入失敗，請稍後再試' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
