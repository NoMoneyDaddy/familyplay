import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')

  if (!token || !type) {
    return NextResponse.redirect(new URL('/auth?error=invalid_token', request.url))
  }

  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
        const response = NextResponse.next()
        for (const { name, value, options } of cookies) {
          response.cookies.set(name, value, options)
        }
        return response
      },
    },
  })

  // Verify the token with Supabase
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: type as 'email' | 'recovery' | 'invite' | 'magiclink',
  })

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url),
    )
  }

  // Successfully verified
  return NextResponse.redirect(new URL('/onboarding', request.url))
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
          const response = NextResponse.next()
          for (const { name, value, options } of cookies) {
            response.cookies.set(name, value, options)
          }
          return response
        },
      },
    })

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email resent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
