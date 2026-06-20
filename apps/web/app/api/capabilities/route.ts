import { ALLOWED_CAPABILITY_KEYS } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'
import { checkRateLimit } from '@/lib/ratelimit'
import { getRequestId } from '@/lib/request-id'

// 能力 key 為 camelCase 值（canRoll…）。白名單避免寫入/回傳任意鍵污染 JSONB。
const ALLOWED = new Set<string>(ALLOWED_CAPABILITY_KEYS)

function getSupabase(
  url: string,
  anonKey: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
}

// 只保留白名單內、值為 true 的能力，過濾殘留舊鍵
function pickAchieved(raw: Record<string, boolean> | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const key of Object.keys(raw || {})) {
    if (raw?.[key] === true && ALLOWED.has(key)) out[key] = true
  }
  return out
}

const getSchema = z.object({ childId: z.string().uuid() })
const patchSchema = z.object({
  childId: z.string().uuid(),
  capabilityKey: z.string().refine((k) => ALLOWED.has(k), '未知的能力'),
  achieved: z.boolean(),
})

// GET /api/capabilities?childId=...
// 回傳該孩子「已達成能力」camelCase→true 對照表，給里程碑評估頁標記目前狀態。
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = getSupabase(url, anonKey, cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(`capabilities-read:${user.id}`, 60)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  const parsed = getSchema.safeParse({
    childId: new URL(request.url).searchParams.get('childId'),
  })
  const requestId = getRequestId(request)
  if (!parsed.success) {
    return NextResponse.json({ error: 'childId 不合法' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', parsed.data.childId)
    .maybeSingle()

  if (error) {
    reportError(error, { route: '/api/capabilities#GET', requestId })
    return NextResponse.json({ error: '無法載入能力資料' }, { status: 500 })
  }

  return NextResponse.json({
    capabilities: pickAchieved(data?.capabilities as Record<string, boolean> | null),
  })
}

// PATCH /api/capabilities  { childId, capabilityKey, achieved }
// 家長標記孩子「會了 / 還沒」某個里程碑能力 → 寫入 child_capability_profiles.capabilities。
// 推薦引擎的 ZPD 評分依此真正生效（先前能力檔永遠空、ZPD 形同沒作用）。
export async function PATCH(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = getSupabase(url, anonKey, cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkRateLimit(`capabilities-write:${user.id}`, 30)
  if (!rl.success) {
    return NextResponse.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '輸入不合法', details: parsed.error.errors }, { status: 400 })
  }
  const { childId, capabilityKey, achieved } = parsed.data
  const requestId = getRequestId(request)

  // 原子更新單一鍵（DB 端 JSONB 合併/刪除），避免並發 read-modify-write 互相覆蓋；
  // RPC 內含缺檔自我修復。RLS 仍在 RPC 內生效（SECURITY INVOKER）。
  const { data, error } = await supabase.rpc('set_child_capability', {
    p_child_id: childId,
    p_key: capabilityKey,
    p_achieved: achieved,
  })

  if (error) {
    // RPC 尚未部署（migration 未套用）→ 退回應用層 read-modify-write，確保上線可用
    if (error.code === 'PGRST202' || /function.+does not exist/i.test(error.message)) {
      return legacyUpdate(supabase, childId, capabilityKey, achieved, requestId)
    }
    reportError(error, { route: '/api/capabilities#PATCH:rpc', requestId })
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }

  // RLS 擋下（非授權孩子）→ 0 列 → NULL
  if (data == null) {
    return NextResponse.json({ error: '找不到孩子的能力檔' }, { status: 404 })
  }

  return NextResponse.json({ capabilities: pickAchieved(data as Record<string, boolean>) })
}

// RPC 尚未部署時的退路：讀-改-寫（含缺檔自我修復）。並發覆蓋風險僅在過渡期存在，
// migration 套用後即走原子 RPC 路徑。
async function legacyUpdate(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  capabilityKey: string,
  achieved: boolean,
  requestId: string,
) {
  const { data: existing, error: readError } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', childId)
    .maybeSingle()

  if (readError) {
    reportError(readError, { route: '/api/capabilities#PATCH:read', requestId })
    return NextResponse.json({ error: '無法載入能力資料' }, { status: 500 })
  }

  // 缺檔自我修復：補建空檔（RLS WITH CHECK 擋掉非授權孩子）
  if (!existing) {
    const { error: insertError } = await supabase
      .from('child_capability_profiles')
      .insert({ child_id: childId, capabilities: {} })
    if (insertError) {
      // 多半是 RLS 擋下（非本家庭孩子）→ 當 404；其餘上報
      return NextResponse.json({ error: '找不到孩子的能力檔' }, { status: 404 })
    }
  }

  const next = { ...((existing?.capabilities as Record<string, boolean> | null) || {}) }
  if (achieved) next[capabilityKey] = true
  else delete next[capabilityKey]

  const { error: writeError } = await supabase
    .from('child_capability_profiles')
    .update({ capabilities: next, last_updated: new Date().toISOString() })
    .eq('child_id', childId)

  if (writeError) {
    reportError(writeError, { route: '/api/capabilities#PATCH:write', requestId })
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }

  return NextResponse.json({ capabilities: pickAchieved(next) })
}
