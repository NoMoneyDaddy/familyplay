import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  const formData = await request.formData()
  const parentEnergy = formData.get('parentEnergy') as string
  const context = formData.get('context') as string

  const { data: children } = await supabase.from('child_profiles').select('id').limit(1)

  if (!children || children.length === 0) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  const searchParams = new URLSearchParams({
    childId: children[0].id,
    parentEnergy,
    context,
  })

  return NextResponse.redirect(new URL(`/recommendations?${searchParams}`, request.url))
}
