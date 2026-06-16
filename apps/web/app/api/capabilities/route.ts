import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { CAPABILITY_KEYS } from '@familyplay/core'

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })

  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: children } = await supabase
    .from('child_profiles')
    .select('id')
    .limit(1)

  if (!children || children.length === 0) {
    return NextResponse.json({ capabilities: [] })
  }

  const { data: capProfile } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', children[0].id)
    .single()

  const achievedCapabilities = new Set(
    Object.keys(capProfile?.capabilities || {}).filter(
      (key) => capProfile?.capabilities[key] === true,
    ),
  )

  const allCapabilities = Object.entries(CAPABILITY_KEYS).map(([key, label]) => ({
    key,
    label,
    achieved: achievedCapabilities.has(key),
  }))

  return NextResponse.json({
    capabilities: allCapabilities,
  })
}
