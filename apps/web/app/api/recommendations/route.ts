import { ALLOWED_STAGE_KEYS, getAgeMonths, getRecommendations, getStageKey } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'

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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 30 recommendation requests per user per minute
  const rl = await checkRateLimit(`recommend:${user.id}`, 30)
  if (!rl.success) {
    return Response.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const {
      childId,
      parentEnergy,
      context,
      availableSpace,
      availableResources,
      maxDurationMinutes,
    } = requestSchema.parse(body)

    // Fetch child
    const { data: child, error: childError } = await supabase
      .from('child_profiles')
      .select('id,birth_year_month,stage_key')
      .eq('id', childId)
      .single()

    if (childError || !child) {
      return Response.json({ error: 'Child not found' }, { status: 404 })
    }

    // birth_year_month is required to compute age safety — don't guess
    if (!child.birth_year_month) {
      return Response.json({ error: '孩子的年齡資料不完整，請先補上出生年月' }, { status: 400 })
    }

    let ageMonths: number
    try {
      ageMonths = getAgeMonths(child.birth_year_month)
    } catch {
      return Response.json({ error: '孩子的出生年月格式不正確' }, { status: 400 })
    }
    if (ageMonths < 0) {
      return Response.json({ error: '孩子的出生年月不能在未來' }, { status: 400 })
    }

    // Pre-filter activities by age in SQL (only columns the engine needs)
    const { data: activities, error: activitiesError } = await supabase
      .from('companion_activities')
      .select(
        'id,title,min_age_months,max_age_months,required_capabilities,optional_capabilities,zpd_targets,stimulation_level,play_type,required_resources,space_requirement,min_duration_minutes,max_duration_minutes,is_bedtime_safe,is_sick_day_safe,is_fallback,is_active',
      )
      .eq('is_active', true)
      .or(`min_age_months.is.null,min_age_months.lte.${ageMonths}`)
      .or(`max_age_months.is.null,max_age_months.gte.${ageMonths}`)

    if (activitiesError) {
      console.error('Failed to fetch activities', activitiesError)
      return Response.json({ error: '無法載入活動資料' }, { status: 500 })
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

    // Validate the cached stage_key against the whitelist; recompute if invalid
    const stageKey = ALLOWED_STAGE_KEYS.includes(child.stage_key as never)
      ? (child.stage_key as (typeof ALLOWED_STAGE_KEYS)[number])
      : getStageKey(ageMonths)

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
          stageKey,
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
