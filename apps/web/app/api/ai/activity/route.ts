import {
  type AIInput,
  type AIProviderName,
  ALLOWED_COMPANION_TYPES,
  ALLOWED_RESOURCE_KEYS,
  ALLOWED_SPACE_CONTEXTS,
  buildActivityPrompt,
  generateSafe,
  getProvider,
  parseGeneratedActivity,
} from '@familyplay/ai'
import { getZpdTargets } from '@familyplay/assessment'
import { type CapabilityKey, getAgeMonths, getStageKey } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

// AI 生成 provider 白名單（BYO 自帶金鑰與 Plus 託管金鑰都從此白名單取用）。
// 兩種模式：
//   1) 免費版「自帶金鑰」(BYO)：request 帶 provider + apiKey，用完即丟、不寫 log/DB。
//   2) Plus「託管金鑰」：request 不帶 provider；伺服器用 env 的託管金鑰，並透過
//      consume_plus_ai_call RPC（SECURITY DEFINER）原子扣 1 次月配額，生成失敗則退還。
const PROVIDERS = ['gemini', 'groq', 'openai', 'ollama'] as const

const bodySchema = z.object({
  childId: z.string().uuid(),
  parentEnergy: z.enum(['low', 'medium', 'high']).default('low'),
  companionType: z
    .string()
    .refine((v) => (ALLOWED_COMPANION_TYPES as string[]).includes(v), '無效'),
  spaceContext: z
    .string()
    .refine((v) => (ALLOWED_SPACE_CONTEXTS as string[]).includes(v), '無效')
    .default('anywhere'),
  availableResources: z
    .array(z.string().refine((v) => (ALLOWED_RESOURCE_KEYS as string[]).includes(v), '無效'))
    .default([]),
  // 金鑰只在本次請求記憶體用、用完即丟，不寫 log/DB（CLAUDE.md AI 安全規則 #3）
  provider: z.enum(PROVIDERS).optional(),
  apiKey: z.string().min(1).max(500).optional(),
  model: z.string().max(120).optional(),
})

// 各 provider 的「預設模型」由環境變數帶入（不在 repo 寫死 model 版本識別碼）
function envModelFor(provider: AIProviderName): string {
  switch (provider) {
    case 'gemini':
      return process.env.AI_GEMINI_MODEL || ''
    case 'groq':
      return process.env.AI_GROQ_MODEL || ''
    case 'openai':
      return process.env.AI_OPENAI_MODEL || ''
    case 'ollama':
      return process.env.AI_OLLAMA_MODEL || ''
    default:
      return ''
  }
}

// 失敗一律回 200 + ok:false，讓前端安靜降回規則式推薦（不把 provider 細節洩漏給客戶端）
function fallback(reason: string) {
  return NextResponse.json({ ok: false, reason })
}

export async function POST(request: Request) {
  // 最外層保險：任何未預期例外（DB 斷線、套件丟錯…）也 reportError 後安靜降回，
  // 不讓端點崩成 500、不洩漏細節。
  try {
    return await handlePost(request)
  } catch (err) {
    reportError(err, { route: '/api/ai/activity' })
    return fallback('internal_error')
  }
}

async function handlePost(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 託管配額退還（生成失敗時呼叫）。退額會「增加」餘額，故 RPC 不開放 authenticated、
  // 只能由後端用 service-role key 呼叫並指定對象（避免使用者自行刷額）。退還失敗只上報、不影響回應。
  const refundManaged = async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      reportError(new Error('SUPABASE_SERVICE_ROLE_KEY missing'), {
        route: '/api/ai/activity#refund',
      })
      return
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { error } = await admin.rpc('refund_plus_ai_call', { p_user_id: user.id })
    if (error) reportError(error, { route: '/api/ai/activity#refund' })
  }

  // 限流：每用戶每分鐘 10 次 AI 請求（CLAUDE.md AI 安全規則 #4）。
  // AI 端點成本/濫用敏感 → fail-closed（限流服務異常時擋下，而非放行）。
  const rl = await checkRateLimit(`ai:${user.id}`, 10, false)
  if (!rl.success) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '輸入不合法' }, { status: 400 })
  }
  const input = parsed.data

  // 決定走「自帶金鑰(BYO)」或「Plus 託管」：request 不帶 provider 即視為要用託管金鑰。
  const wantsManaged = !input.provider
  let providerName: AIProviderName
  let apiKey: string | undefined
  let model: string
  let ollamaBaseUrl: string | undefined
  if (wantsManaged) {
    const mp = process.env.AI_MANAGED_PROVIDER
    const mk = process.env.AI_MANAGED_KEY
    // 未配置託管金鑰 → 當作沒有可用 provider（前端安靜降回規則式）
    if (!mp || !mk || !(PROVIDERS as readonly string[]).includes(mp)) {
      return fallback('no_provider')
    }
    providerName = mp as AIProviderName
    apiKey = mk
    // 未設 AI_MANAGED_MODEL 時退回該 provider 的預設模型，避免空字串導致生成失敗
    model = process.env.AI_MANAGED_MODEL || envModelFor(providerName)
  } else if (input.provider) {
    // BYO：ollama 走伺服器端 env URL（不收 client baseUrl，避免 SSRF）；其餘必須帶 apiKey
    if (input.provider !== 'ollama' && !input.apiKey) return fallback('no_key')
    providerName = input.provider
    apiKey = input.apiKey
    model = input.model || envModelFor(input.provider)
    ollamaBaseUrl = input.provider === 'ollama' ? process.env.AI_OLLAMA_URL : undefined
  } else {
    // 不可達（wantsManaged 為 false 即代表 input.provider 有值），僅為型別窮舉
    return fallback('no_provider')
  }

  // ── 取孩子的階段 + 發展中能力（ZPD），組成不含個資的 AIInput ──
  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .select('id,birth_year_month')
    .eq('id', input.childId)
    .maybeSingle()
  if (childError) {
    // 真正的查詢/RLS 故障 → 上報並安靜降回（別偽裝成 404）
    reportError(childError, { route: '/api/ai/activity#child' })
    return fallback('db_error')
  }
  if (!child?.birth_year_month) {
    return NextResponse.json({ error: '找不到孩子或年齡資料不完整' }, { status: 404 })
  }

  let ageMonths: number
  try {
    ageMonths = getAgeMonths(child.birth_year_month)
  } catch {
    return NextResponse.json({ error: '出生年月格式不正確' }, { status: 400 })
  }
  if (ageMonths < 0) {
    return NextResponse.json({ error: '出生年月不能在未來' }, { status: 400 })
  }
  const stageKey = getStageKey(ageMonths)

  const { data: capProfile, error: capError } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', input.childId)
    .maybeSingle()
  if (capError) reportError(capError, { route: '/api/ai/activity#capabilities' })
  const capabilities = (capProfile?.capabilities as Record<string, boolean> | null) || {}
  const acquired = Object.keys(capabilities).filter((k) => capabilities[k] === true)
  // 發展中能力 = ZPD（已會能力的下一步）；assessment 內部以 MILESTONE_MAP 過濾白名單外的鍵
  const developing = getZpdTargets(acquired as CapabilityKey[])

  const aiInput: AIInput = {
    stageKey,
    capabilityKeys: developing,
    parentEnergy: input.parentEnergy,
    spaceContext: input.spaceContext as AIInput['spaceContext'],
    companionType: input.companionType as AIInput['companionType'],
    availableResources: input.availableResources as AIInput['availableResources'],
  }

  const provider = getProvider(providerName, {
    apiKey,
    // ollama base URL 只能來自伺服器設定，不接受客戶端輸入（防 SSRF）
    baseUrl: ollamaBaseUrl,
    model,
  })
  if (!provider) return fallback('no_provider')

  // 託管模式：在實際呼叫 AI 前原子扣 1 次月配額（非 Plus / 額度用盡 → 安靜降回）。
  // BYO 模式不計配額。扣完才生成，生成失敗會退還。
  let managed = false
  if (wantsManaged) {
    const { data: consume, error: consumeErr } = await supabase.rpc('consume_plus_ai_call')
    if (consumeErr) {
      reportError(consumeErr, { route: '/api/ai/activity#consume' })
      return fallback('quota_error')
    }
    const consumed = consume as { allowed?: boolean; reason?: string } | null
    if (consumed?.allowed !== true) {
      return fallback(consumed?.reason || 'not_plus')
    }
    managed = true
  }

  const result = await generateSafe(provider, aiInput, buildActivityPrompt)
  if (!result.ok) {
    // invalid_input / safety_blocked / provider_failed → 安靜降回規則式
    if (managed) await refundManaged()
    return fallback(result.reason)
  }

  const activity = parseGeneratedActivity(result.content)
  if (!activity) {
    if (managed) await refundManaged()
    return fallback('parse_failed')
  }

  return NextResponse.json({ ok: true, source: 'ai', activity })
}
