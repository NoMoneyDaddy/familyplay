import { CAPABILITY_KEYS } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  childId: z.string().uuid(),
})

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

  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    if (!childId) {
      return NextResponse.json({ error: 'childId query parameter required' }, { status: 400 })
    }

    const { childId: validatedChildId } = querySchema.parse({ childId })

    const { data: capProfile } = await supabase
      .from('child_capability_profiles')
      .select('capabilities')
      .eq('child_id', validatedChildId)
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
