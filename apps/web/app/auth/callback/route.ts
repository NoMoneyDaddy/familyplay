import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 帶 next（站內路徑）時回原頁，例如帶邀請碼的 /join；否則回 '/' 由其判斷
      // onboarding vs select（既有使用者不應重新引導）。只接受站內路徑，避免 open redirect。
      const rawNext = requestUrl.searchParams.get('next')
      const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth?error=auth_failed', request.url))
}
