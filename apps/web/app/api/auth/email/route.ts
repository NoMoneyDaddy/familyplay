import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const emailAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = emailAuthSchema.parse(body)

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

    // Try to sign up first (new user)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    // If signup fails with "User already exists", try to sign in instead
    if (signUpError?.message?.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        return NextResponse.json(
          {
            error:
              signInError.message === 'Invalid login credentials'
                ? 'Email or password is incorrect'
                : signInError.message,
          },
          { status: 401 },
        )
      }

      if (signInData.session) {
        // Set auth cookies and redirect
        const response = NextResponse.redirect(new URL('/onboarding', request.url))
        return response
      }
    }

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message || 'Signup failed' }, { status: 400 })
    }

    // Signup successful
    if (signUpData.user) {
      // Email verification required
      // Supabase will send email verification link if configured
      return NextResponse.json(
        {
          success: true,
          message: 'Signup successful! Please check your email to verify your account.',
          requiresVerification: true,
          userId: signUpData.user.id,
        },
        { status: 200 },
      )
    }

    return NextResponse.json({ error: 'Signup failed' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 },
      )
    }

    console.error('Email auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
