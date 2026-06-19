import { ALLOWED_CAPABILITY_KEYS } from '@familyplay/core'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/observability'

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

  const parsed = getSchema.safeParse({
    childId: new URL(request.url).searchParams.get('childId'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'childId 不合法' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', parsed.data.childId)
    .maybeSingle()

  if (error) {
    reportError(error, { route: '/api/capabilities#GET' })
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

  // 讀目前能力 map，合併單一鍵後寫回（RLS 確保只有本家庭照顧者能讀寫此孩子的檔）
  const { data: existing, error: readError } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', childId)
    .maybeSingle()

  if (readError) {
    reportError(readError, { route: '/api/capabilities#PATCH:read' })
    return NextResponse.json({ error: '無法載入能力資料' }, { status: 500 })
  }
  if (!existing) {
    // 沒有能力檔代表孩子不存在或不屬於此使用者（被 RLS 擋下）→ 當 404
    return NextResponse.json({ error: '找不到孩子的能力檔' }, { status: 404 })
  }

  const next = { ...((existing.capabilities as Record<string, boolean> | null) || {}) }
  if (achieved) next[capabilityKey] = true
  else delete next[capabilityKey]

  const { error: writeError } = await supabase
    .from('child_capability_profiles')
    .update({ capabilities: next, last_updated: new Date().toISOString() })
    .eq('child_id', childId)

  if (writeError) {
    reportError(writeError, { route: '/api/capabilities#PATCH:write' })
    return NextResponse.json({ error: '儲存失敗，請稍後再試' }, { status: 500 })
  }

  return NextResponse.json({ capabilities: pickAchieved(next) })
}
