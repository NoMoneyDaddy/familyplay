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
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'

// BYO（自帶金鑰）provider 白名單。
// 註：此端點目前只做「免費版自帶金鑰」；Plus 託管金鑰＋配額計次需要 service-role 寫
// entitlements（anon client 受 RLS 擋，且涉及付費資安），留待後續 PR。
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

  // BYO：ollama 走伺服器端 env URL（不收 client baseUrl，避免 SSRF）；其餘必須帶 apiKey
  if (!input.provider) return fallback('no_provider')
  if (input.provider !== 'ollama' && !input.apiKey) return fallback('no_key')

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

  const provider = getProvider(input.provider, {
    apiKey: input.apiKey,
    // ollama base URL 只能來自伺服器設定，不接受客戶端輸入（防 SSRF）
    baseUrl: input.provider === 'ollama' ? process.env.AI_OLLAMA_URL : undefined,
    model: input.model || envModelFor(input.provider),
  })
  if (!provider) return fallback('no_provider')

  const result = await generateSafe(provider, aiInput, buildActivityPrompt)
  if (!result.ok) {
    // invalid_input / safety_blocked / provider_failed → 安靜降回規則式
    return fallback(result.reason)
  }

  const activity = parseGeneratedActivity(result.content)
  if (!activity) return fallback('parse_failed')

  return NextResponse.json({ ok: true, source: 'ai', activity })
}
