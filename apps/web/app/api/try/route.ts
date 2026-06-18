import { getRecommendations, getStageKey } from '@familyplay/core'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'

// 「快速試用」：不需登入、不需建立孩子。當場給年齡 + 狀態，直接跑推薦引擎回傳建議。
// 不寫入任何資料、不記錄歷史——純推薦。只讀「公開的活動庫」，故用 service role 讀取
// （companion_activities 是內容資料，非使用者資料），其餘輸入皆為當下參數。
const schema = z.object({
  ageMonths: z.number().int().min(0).max(72),
  parentEnergy: z.enum(['exhausted', 'low', 'medium', 'high']),
  context: z.enum(['bedtime', 'emotional_crisis', 'sick_day', 'normal']),
  availableSpace: z
    .enum(['anywhere', 'living_room', 'bedroom', 'outdoor', 'kitchen'])
    .default('anywhere'),
  maxDurationMinutes: z.number().int().positive().max(120).default(20),
})

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // 無登入：以來源 IP 限流，避免濫用（沒設 Upstash 時自動略過）。
  // 優先用代理設定的 x-real-ip（較難偽造）；x-forwarded-for 最左是 client、可被竄改用來繞過限流。
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anon'
  const rl = await checkRateLimit(`try:${ip}`, 20)
  if (!rl.success) {
    return Response.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  // 解析 JSON：格式錯誤回 400（而非落入下方一般 500）
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const { ageMonths, parentEnergy, context, availableSpace, maxDurationMinutes } =
      schema.parse(body)

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data: activities, error: activitiesError } = await supabase
      .from('companion_activities')
      .select(
        'id,title,min_age_months,max_age_months,required_capabilities,optional_capabilities,zpd_targets,stimulation_level,play_type,required_resources,space_requirement,min_duration_minutes,max_duration_minutes,is_bedtime_safe,is_sick_day_safe,is_fallback,is_active',
      )
      .eq('is_active', true)
      .or(`min_age_months.is.null,min_age_months.lte.${ageMonths}`)
      .or(`max_age_months.is.null,max_age_months.gte.${ageMonths}`)

    if (activitiesError) {
      console.error('Failed to fetch activities (try)', activitiesError)
      return Response.json({ error: '無法載入活動資料' }, { status: 500 })
    }

    const stageKey = getStageKey(ageMonths)

    const recs = getRecommendations(
      (activities || []).map((a) => ({
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
          id: 'guest',
          stageKey,
          ageMonths,
          // 試用無歷史能力資料：用空集合（引擎會以年齡安全 + 情境 + 優先序給建議）
          acquiredCapabilities: new Set<string>(),
        },
        parentEnergy,
        context,
        availableSpace,
        availableResources: new Set<string>(),
        recentActivityIds: new Set<string>(),
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
