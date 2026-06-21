import {
  type AIInput,
  type AIProviderName,
  buildHandoffPrompt,
  generateSafe,
  getProvider,
  sanitizeHandoffSummary,
} from '@familyplay/ai'
import { getZpdTargets } from '@familyplay/assessment'
import {
  type CapabilityKey,
  getAgeMonths,
  getAgeMonthsFromDate,
  getStageKey,
} from '@familyplay/core'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'
import { getRequestId } from '@/lib/request-id'
import { getApiSupabase } from '@/lib/supabase/api'

// 交接小卡「AI 溫暖短評」（白皮書 AI2 潤色半部）。
// 與 /api/ai/activity 共用同一套 AI 安全管線：白名單輸入 → provider → Safety Filter →
// 失敗安靜降回（前端續用規則式摘要）。資料面與活動生成「完全相同」（只送 stageKey +
// 發展中能力 key），不新增任何個資。BYO 自帶金鑰或 Plus 託管金鑰（原子扣配額、失敗退還）。
const PROVIDERS = ['gemini', 'groq', 'openai', 'ollama'] as const

const bodySchema = z.object({
  childId: z.string().uuid(),
  provider: z.enum(PROVIDERS).optional(),
  apiKey: z.string().min(1).max(500).optional(),
  model: z.string().max(120).optional(),
})

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

// 失敗一律回 200 + ok:false，讓前端安靜續用規則式摘要（不洩漏 provider 細節）。
function fallback(reason: string) {
  return NextResponse.json({ ok: false, reason })
}

export async function POST(request: Request) {
  try {
    return await handlePost(request)
  } catch (err) {
    reportError(err, { route: '/api/ai/handoff', requestId: getRequestId(request) })
    return fallback('internal_error')
  }
}

async function handlePost(request: Request) {
  const supabase = await getApiSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 託管配額退還（生成失敗時）。只能由後端 service-role 指定對象呼叫（防自助刷額）。
  const refundManaged = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      reportError(new Error('SUPABASE_SERVICE_ROLE_KEY missing'), {
        route: '/api/ai/handoff#refund',
      })
      return
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { error } = await admin.rpc('refund_plus_ai_call', { p_user_id: user.id })
    if (error) reportError(error, { route: '/api/ai/handoff#refund' })
  }

  // AI 端點成本/濫用敏感 → fail-closed。
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

  // 走 BYO 或 Plus 託管（不帶 provider 即託管）。
  const wantsManaged = !input.provider
  let providerName: AIProviderName
  let apiKey: string | undefined
  let model: string
  let ollamaBaseUrl: string | undefined
  if (wantsManaged) {
    const mp = process.env.AI_MANAGED_PROVIDER
    const mk = process.env.AI_MANAGED_KEY
    if (!mp || !(PROVIDERS as readonly string[]).includes(mp)) return fallback('no_provider')
    if (mp !== 'ollama' && !mk) return fallback('no_provider')
    providerName = mp as AIProviderName
    apiKey = mp === 'ollama' ? undefined : mk
    model = process.env.AI_MANAGED_MODEL || envModelFor(providerName)
    ollamaBaseUrl = mp === 'ollama' ? process.env.AI_OLLAMA_URL : undefined
  } else if (input.provider) {
    if (input.provider !== 'ollama' && !input.apiKey) return fallback('no_key')
    providerName = input.provider
    apiKey = input.apiKey
    model = input.model || envModelFor(input.provider)
    ollamaBaseUrl = input.provider === 'ollama' ? process.env.AI_OLLAMA_URL : undefined
  } else {
    return fallback('no_provider')
  }

  // SSRF 防護：ollama 缺伺服器端 base URL 一律擋下。
  if (providerName === 'ollama' && !ollamaBaseUrl) return fallback('no_provider')
  if (!model) return fallback('no_provider')

  // 取孩子的階段 + 發展中能力（ZPD），組成不含個資的 AIInput。
  const { data: child, error: childError } = await supabase
    .from('child_profiles')
    .select('id,birth_year_month')
    .eq('id', input.childId)
    .maybeSingle()
  if (childError) {
    reportError(childError, { route: '/api/ai/handoff#child' })
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
  // 生日精確到日（若有）：用完整生日算更準的月齡（去識別化，不送原始生日/姓名）。
  const { data: bd } = await supabase
    .from('child_profiles')
    .select('birth_date')
    .eq('id', input.childId)
    .maybeSingle()
  if (bd?.birth_date && typeof bd.birth_date === 'string') {
    try {
      const precise = getAgeMonthsFromDate(bd.birth_date)
      if (precise >= 0) ageMonths = precise
    } catch {
      // 格式異常 → 維持年月推出的月齡
    }
  }
  const stageKey = getStageKey(ageMonths)

  const { data: capProfile, error: capError } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', input.childId)
    .maybeSingle()
  if (capError) reportError(capError, { route: '/api/ai/handoff#capabilities' })
  const capabilities = (capProfile?.capabilities as Record<string, boolean> | null) || {}
  const acquired = Object.keys(capabilities).filter((k) => capabilities[k] === true)
  const developing = getZpdTargets(acquired as CapabilityKey[])

  // 交接短評只用到 stageKey + capabilityKeys；其餘欄位給通過白名單驗證用的安全預設值。
  const aiInput: AIInput = {
    stageKey,
    capabilityKeys: developing,
    parentEnergy: 'low',
    spaceContext: 'anywhere',
    companionType: 'talk',
    availableResources: [],
    ageMonths,
  }

  const provider = getProvider(providerName, { apiKey, baseUrl: ollamaBaseUrl, model })
  if (!provider) return fallback('no_provider')

  // 託管模式：呼叫 AI 前原子扣 1 次月配額；生成失敗退還。
  let managed = false
  if (wantsManaged) {
    const { data: consume, error: consumeErr } = await supabase.rpc('consume_plus_ai_call')
    if (consumeErr) {
      reportError(consumeErr, { route: '/api/ai/handoff#consume' })
      return fallback('quota_error')
    }
    const consumed = consume as { allowed?: boolean; reason?: string } | null
    if (consumed?.allowed !== true) {
      return fallback(consumed?.reason || 'not_plus')
    }
    managed = true
  }

  const result = await generateSafe(provider, aiInput, buildHandoffPrompt)
  if (!result.ok) {
    if (managed) await refundManaged()
    return fallback(result.reason)
  }

  const summary = sanitizeHandoffSummary(result.content)
  if (!summary) {
    if (managed) await refundManaged()
    return fallback('parse_failed')
  }

  return NextResponse.json({ ok: true, summary })
}
