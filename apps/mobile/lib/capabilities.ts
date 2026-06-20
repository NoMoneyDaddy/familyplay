import { ALLOWED_CAPABILITY_KEYS, type CapabilityKey } from '@familyplay/core'
import type { SupabaseClient } from '@supabase/supabase-js'

// 行動端里程碑能力：與 Web /api/capabilities 同流程，直接用行動端 Supabase client（RLS 生效）。
// 標記後驅動推薦引擎 ZPD 評分與 Step 8 個人化。

const ALLOWED = new Set<string>(ALLOWED_CAPABILITY_KEYS)

export type AchievedMap = Partial<Record<CapabilityKey, true>>

export class CapabilityError extends Error {}

/** 只保留白名單內、值為 true 的能力（過濾殘留舊鍵）。抽出以便單元測試。 */
export function pickAchieved(raw: Record<string, unknown> | null | undefined): AchievedMap {
  const out: AchievedMap = {}
  for (const key of Object.keys(raw || {})) {
    if (raw?.[key] === true && ALLOWED.has(key)) out[key as CapabilityKey] = true
  }
  return out
}

/** 讀取孩子已達成能力 map。 */
export async function fetchAchievedCapabilities(
  supabase: SupabaseClient,
  childId: string,
): Promise<AchievedMap> {
  const { data, error } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', childId)
    .maybeSingle()
  if (error) throw new CapabilityError('無法載入能力資料')
  return pickAchieved(data?.capabilities as Record<string, unknown> | null)
}

/**
 * 標記「會了 / 還沒」單一能力。優先用原子 RPC（set_child_capability，含缺檔自我修復）；
 * RPC 尚未部署時退回讀-改-寫。與 Web PATCH 同邏輯。失敗丟 CapabilityError。
 */
export async function setChildCapability(
  supabase: SupabaseClient,
  childId: string,
  key: CapabilityKey,
  achieved: boolean,
): Promise<void> {
  if (!ALLOWED.has(key)) throw new CapabilityError('未知的能力')

  const { error } = await supabase.rpc('set_child_capability', {
    p_child_id: childId,
    p_key: key,
    p_achieved: achieved,
  })
  if (!error) return

  // RPC 未部署（migration 未套用）→ 退回應用層讀-改-寫
  if (error.code === 'PGRST202' || /function.+does not exist/i.test(error.message)) {
    await legacyUpdate(supabase, childId, key, achieved)
    return
  }
  throw new CapabilityError('儲存失敗，請稍後再試')
}

async function legacyUpdate(
  supabase: SupabaseClient,
  childId: string,
  key: CapabilityKey,
  achieved: boolean,
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('child_capability_profiles')
    .select('capabilities')
    .eq('child_id', childId)
    .maybeSingle()
  if (readError) throw new CapabilityError('無法載入能力資料')

  if (!existing) {
    const { error: insertError } = await supabase
      .from('child_capability_profiles')
      .insert({ child_id: childId, capabilities: {} })
    if (insertError) throw new CapabilityError('找不到孩子的能力檔')
  }

  const next = { ...((existing?.capabilities as Record<string, boolean> | null) || {}) }
  if (achieved) next[key] = true
  else delete next[key]

  const { error: writeError } = await supabase
    .from('child_capability_profiles')
    .update({ capabilities: next, last_updated: new Date().toISOString() })
    .eq('child_id', childId)
  if (writeError) throw new CapabilityError('儲存失敗，請稍後再試')
}
