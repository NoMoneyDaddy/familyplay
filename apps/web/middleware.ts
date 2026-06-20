import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // 為每個請求建立關聯 id（風險 A2）：沿用上游傳入的 x-request-id，否則新生。
  // 轉發進 request header（route handler 與 Sentry 請求上下文可讀），並回應 echo
  // 給客戶端，讓一線運維能用同一個 id 把「用戶看到的錯誤」對應到 server log / Sentry。
  const requestHeaders = new Headers(request.headers)
  const requestId = requestHeaders.get('x-request-id') || crypto.randomUUID()
  requestHeaders.set('x-request-id', requestId)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // IMPORTANT: Do not write logic between createServerClient and getUser
  await supabase.auth.getUser()

  supabaseResponse.headers.set('x-request-id', requestId)
  return supabaseResponse
}

export const config = {
  matcher: [
    // Skip static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
