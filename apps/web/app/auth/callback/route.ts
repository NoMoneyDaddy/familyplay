import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // 正式環境在反向代理（Zeabur）後面，request.url 的 host 會是容器內部位址
  // （0.0.0.0:3000）——若直接用它組導向網址，登入後會跳到 http://0.0.0.0:3000。
  // 一律改用代理帶的 forwarded host/proto 組對外網址，再退回 NEXT_PUBLIC_APP_URL。
  // 安全：優先用可信的 NEXT_PUBLIC_APP_URL（避免攻擊者偽造 x-forwarded-host 做 open
  // redirect / 授權碼劫持）；未設定時（dev/preview）才退回代理 host，最後 request.url。
  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  const publicOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (fwdHost ? `${fwdProto}://${fwdHost}` : undefined) ||
    requestUrl.origin

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
      // onboarding vs select。只接受純站內路徑，避免 open redirect——'/\evil.com'
      // 會被正規化成 '//evil.com' 導向外站，故第二個字元也要排除反斜線。
      const rawNext = requestUrl.searchParams.get('next')
      const next = rawNext && (rawNext === '/' || /^\/[^/\\]/.test(rawNext)) ? rawNext : '/'
      return NextResponse.redirect(new URL(next, publicOrigin))
    }
  }

  return NextResponse.redirect(new URL('/auth?error=auth_failed', publicOrigin))
}
