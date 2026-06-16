import { getRecommendations, STAGE_KEYS } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const requestSchema = z.object({
  childId: z.string().uuid(),
  parentEnergy: z.enum(['exhausted', 'low', 'medium', 'high']),
  context: z.enum(['bedtime', 'emotional_crisis', 'sick_day', 'normal']),
  availableSpace: z.enum(['anywhere', 'living_room', 'bedroom', 'outdoor', 'kitchen']),
  availableResources: z.array(z.string()).default([]),
  maxDurationMinutes: z.number().int().positive().default(30),
})

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
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
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { childId, parentEnergy, context, availableSpace, availableResources, maxDurationMinutes } =
      requestSchema.parse(body)

    // Fetch child
    const { data: child, error: childError } = await supabase
      .from('child_profiles')
      .select('id,birth_year_month,stage_key')
      .eq('id', childId)
      .single()

    if (childError || !child) {
      return Response.json({ error: 'Child not found' }, { status: 404 })
    }

    // Fetch activities
    const { data: activities, error: activitiesError } = await supabase
      .from('companion_activities')
      .select('*')
      .eq('is_active', true)

    if (activitiesError) {
      return Response.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    // Fetch recent logs for recency penalty
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLogs } = await supabase
      .from('companion_logs')
      .select('activity_id')
      .eq('child_id', childId)
      .gt('created_at', sevenDaysAgo)

    const recentActivityIds = new Set(recentLogs?.map((l) => l.activity_id).filter(Boolean) || [])

    // Fetch child capabilities
    const { data: capProfile } = await supabase
      .from('child_capability_profiles')
      .select('capabilities')
      .eq('child_id', childId)
      .single()

    const acquiredCapabilities = new Set(
      Object.keys(capProfile?.capabilities || {}).filter(
        (key) => capProfile?.capabilities[key] === true,
      ),
    )

    // Calculate age from birth_year_month
    const [year, month] = (child.birth_year_month || '2024-06').split('-').map(Number)
    const birthDate = new Date(year, month - 1, 1)
    const now = new Date()
    const ageMonths =
      (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

    // Get recommendations
    const recs = getRecommendations(
      activities.map((a) => ({
        id: a.id,
        title: a.title,
        minAgeMonths: a.min_age_months,
        maxAgeMonths: a.max_age_months,
        requiredCapabilities: a.required_capabilities || [],
        optionalCapabilities: a.optional_capabilities || [],
        zpdTargets: a.zpd_targets || [],
        stimulationLevel: a.stimulation_level,
        requiredResources: a.required_resources || [],
        spaceRequirement: a.space_requirement || 'anywhere',
        minDurationMinutes: a.min_duration_minutes,
        maxDurationMinutes: a.max_duration_minutes,
        isBedtimeSafe: a.is_bedtime_safe,
        isSickDaySafe: a.is_sick_day_safe,
        isFallback: a.is_fallback,
        isActive: a.is_active,
      })),
      {
        child: {
          id: childId,
          stageKey: (child.stage_key as any) || STAGE_KEYS.TODDLER_PLAYER,
          ageMonths,
          acquiredCapabilities,
        },
        parentEnergy,
        context,
        availableSpace,
        availableResources: new Set(availableResources),
        recentActivityIds,
        maxDurationMinutes,
      },
      3,
    )

    return Response.json({
      recommendations: recs.map((r) => ({
        id: r.id,
        title: r.title,
        score: r.score,
        reasons: r.reasons,
      })),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
