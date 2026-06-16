import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const passwordUpdateSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  token: z.string().min(1, 'Token is required'),
  type: z.enum(['recovery', 'email']),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Check if this is a password reset request or password update
    if (body.token) {
      // Update password with token
      const { password, token, type } = passwordUpdateSchema.parse(body)

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

      // Verify token and update password
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'email' | 'recovery',
      })

      if (verifyError) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully!',
      })
    }
    // Send password reset email
    const { email } = passwordResetSchema.parse(body)

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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset?type=recovery`,
    })

    if (error) {
      return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 },
      )
    }

    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
