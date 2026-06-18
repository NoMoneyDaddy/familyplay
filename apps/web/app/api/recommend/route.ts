import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'

const formSchema = z.object({
  parentEnergy: z.enum(['exhausted', 'low', 'medium', 'high']),
  context: z.enum(['bedtime', 'emotional_crisis', 'sick_day', 'normal']),
})

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  // 反向代理（Zeabur）後面 request.url 的 host 是內部位址（0.0.0.0:3000）會跳到 0.0.0.0。
  // 安全：優先用可信的 NEXT_PUBLIC_APP_URL，避免攻擊者偽造 x-forwarded-host 做 open redirect。
  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  const publicOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (fwdHost ? `${fwdProto}://${fwdHost}` : undefined) ||
    new URL(request.url).origin

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.redirect(new URL('/auth', publicOrigin))
  }

  const rl = await checkRateLimit(`recommend-form:${user.id}`, 30)
  if (!rl.success) {
    return NextResponse.redirect(new URL('/select?error=rate', publicOrigin))
  }

  const formData = await request.formData()
  const parsed = formSchema.safeParse({
    parentEnergy: formData.get('parentEnergy'),
    context: formData.get('context'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { parentEnergy, context } = parsed.data

  const { data: children } = await supabase.from('child_profiles').select('id').limit(1)

  if (!children || children.length === 0) {
    return NextResponse.redirect(new URL('/onboarding', publicOrigin))
  }

  const searchParams = new URLSearchParams({
    childId: children[0].id,
    parentEnergy,
    context,
  })

  return NextResponse.redirect(new URL(`/recommendations?${searchParams}`, publicOrigin))
}
